import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError, BadGatewayError, UnprocessableEntityError } from '../../shared/errors/HttpErrors.js';
import {
  extractSkillsHeuristic,
  parseSkillSuggestionSource,
  parseSuggestedSkillsFromAiResponse,
  type SkillSuggestionSource,
  type SuggestedSkill,
} from '../../shared/utils/skill-heuristic.js';

export interface SuggestSkillsResult {
  skills: SuggestedSkill[];
  source: SkillSuggestionSource;
}
import { SearchUsersDto } from './dto/search-users.dto.js';
import { UpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { UpdateProfileSkillsDto } from './dto/update-profile-skills.dto.js';
import { ProfileRepository } from './repositories/profile.repository.js';
import { PublicProfile, PublicProfileSearchResult, UserReputation } from './types/profile.types.js';

const PROMPT_INJECTION_PATTERNS = [
  /ignore (?:all )?previous instructions/i,
  /disregard (?:all )?previous instructions/i,
  /forget (?:all )?previous instructions/i,
  /do not follow any rules/i,
  /bypass (?:the )?safety/i,
  /system prompt/i,
  /assistant instructions/i,
  /security policy/i
];

function sanitizeAiPrompt(text: string): string {
  const sanitized = text.trim();

  if (!sanitized) {
    return sanitized;
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new UnprocessableEntityError('Prompt injection detected in text input');
    }
  }

  return sanitized;
}

async function extractTextFromPdf(file: Express.Multer.File): Promise<string> {
  try {
    const pdfParseModule = (await import('pdf-parse')) as unknown as {
      default?: (buffer: Buffer) => Promise<{ text: string }>;
      PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> };
      (buffer: Buffer): Promise<{ text: string }>;
    };

    const buffer = file.buffer as Buffer;

    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const text = typeof textResult.text === 'string' ? textResult.text.trim() : '';
      if (text) return text;
    }

    const parser =
      pdfParseModule.default ??
      (pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string }>);
    const result = await parser(buffer);
    return typeof result.text === 'string' ? result.text.trim() : '';
  } catch (error) {
    console.error('PDF parse failed', error);
    return '';
  }
}

export class ProfileService {
  public constructor(private readonly profileRepository: ProfileRepository) {}

  public async updateExperience(userId: string, input: UpdateProfileExperienceDto): Promise<PublicProfile> {
    const profile = await this.profileRepository.replaceUserExperience(userId, input.experience);

    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile;
  }

  public async suggestSkills(
    _userId: string,
    input: { text?: string; file?: Express.Multer.File }
  ): Promise<SuggestSkillsResult> {
    let extractedText = '';

    if (input.file) {
      extractedText = await extractTextFromPdf(input.file);
      if (!extractedText) {
        throw new BadRequestError(
          'No se pudo extraer texto del PDF. Usa un PDF con texto seleccionable (no solo imagen escaneada).'
        );
      }
    }

    const combinedText = [input.text?.trim(), extractedText].filter(Boolean).join('\n\n');

    if (!combinedText) {
      throw new BadRequestError('Text is required to suggest skills');
    }

    const cleanedText = sanitizeAiPrompt(combinedText);
    const aiUrl = env.aiServiceUrl?.trim();

    if (!aiUrl) {
      console.warn('[profile] AI_SERVICE_URL no configurado; usando extracción heurística local.');
      return { skills: extractSkillsHeuristic(cleanedText), source: 'heuristic' };
    }

    const parsedUrl = new URL(aiUrl);
    const isProcessSkillsPath = parsedUrl.pathname.endsWith('/process-skills');
    const path = isProcessSkillsPath
      ? parsedUrl.pathname + (parsedUrl.search || '')
      : `${parsedUrl.pathname.replace(/\/$/, '')}/api/ai/process-skills${parsedUrl.search || ''}`;
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? await import('https') : await import('http');

    const body = JSON.stringify({ text: cleanedText });

    const options: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 25000
    };

    const resp = await new Promise<any>((resolve, reject) => {
      const req = (httpModule as any).request(options, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(raw || '{}');
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (_err) {
            resolve({ statusCode: res.statusCode, body: raw });
          }
        });
      });

      req.on('error', (err: unknown) => reject(err));
      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    }).catch(() => null);

    const aiErrorMessage =
      resp?.body && typeof resp.body === 'object' && typeof (resp.body as { error?: unknown }).error === 'string'
        ? String((resp.body as { error: string }).error)
        : undefined;

    if (!resp || resp.statusCode >= 500 || resp.statusCode === 503) {
      console.warn(
        '[profile] ai-service no disponible; usando extracción heurística local.',
        aiErrorMessage ?? 'sin respuesta'
      );
      return { skills: extractSkillsHeuristic(cleanedText), source: 'heuristic' };
    }

    if (resp.statusCode >= 400) {
      throw new BadGatewayError(aiErrorMessage ?? 'El servicio de IA devolvió un error.');
    }

    const source = parseSkillSuggestionSource(resp.body);
    const parsed = parseSuggestedSkillsFromAiResponse(resp.body);
    if (parsed.length > 0) {
      return { skills: parsed, source };
    }

    const heuristicSkills = extractSkillsHeuristic(cleanedText);
    if (heuristicSkills.length > 0) {
      console.warn('[profile] IA sin habilidades parseables; usando extracción heurística local.');
      return { skills: heuristicSkills, source: 'heuristic' };
    }

    throw new BadRequestError(
      'No se detectaron habilidades en el texto. Describe experiencia, tecnologías, áreas o competencias de forma más explícita.'
    );
  }

  public async updateAvailability(userId: string, input: UpdateProfileAvailabilityDto): Promise<PublicProfile> {
    const profile = await this.profileRepository.replaceUserAvailability(userId, input.availability);

    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile;
  }

  public async updateSkills(userId: string, input: UpdateProfileSkillsDto): Promise<PublicProfile> {
    const profile = await this.profileRepository.replaceUserSkills(userId, input.skills);

    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile;
  }

  public async getPublicProfile(userId: string): Promise<PublicProfile> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestError('User id is required');
    }

    const profile = await this.profileRepository.findPublicProfileByUserId(normalizedUserId);

    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile;
  }

  public async getUserReputation(userId: string): Promise<UserReputation> {
    const profile = await this.getPublicProfile(userId);

    const skills = (profile.skills || []).map((skill) => skill.trim().toLowerCase()).filter(Boolean);
    const skillsCount = skills.length;
    const skillsScore = Math.min(skillsCount * 10, 100);

    const totalExperienceYears = (profile.experience || []).reduce(
      (sum, experience) => sum + Math.max(0, experience.yearsOfExperience || 0),
      0
    );
    const experienceScore = Math.min(totalExperienceYears * 10, 100);

    const availabilityDays = new Set((profile.availability || []).map((day) => day.day)).size;
    const availabilityScore = Math.round((availabilityDays / 7) * 100);

    const experienceSkillSet = new Set(
      (profile.experience || []).map((experience) => experience.skillName.trim().toLowerCase()).filter(Boolean)
    );
    const experienceAlignmentScore =
      skillsCount === 0
        ? 0
        : Math.round(
            (skills.filter((skill) => experienceSkillSet.has(skill)).length / skillsCount) * 100
          );

    const reputationScore = Math.round(
      ((skillsScore * 0.3 + experienceScore * 0.3 + availabilityScore * 0.2 + experienceAlignmentScore * 0.2) * 100) / 100
    );

    return {
      userId: profile.userId,
      user: profile.user,
      reputationScore,
      breakdown: {
        skillsCount,
        skillsScore,
        totalExperienceYears,
        experienceScore,
        availabilityDays,
        availabilityScore,
        experienceAlignmentScore
      }
    };
  }

  public async searchUsers(filters: SearchUsersDto): Promise<PublicProfileSearchResult[]> {
    return this.profileRepository.searchPublicProfiles(filters);
  }
}
