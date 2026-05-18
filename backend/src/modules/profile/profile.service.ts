import { BadRequestError, NotFoundError, BadGatewayError, UnprocessableEntityError } from '../../shared/errors/HttpErrors.js';
import { SearchUsersDto } from './dto/search-users.dto.js';
import { UpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { UpdateProfileSkillsDto } from './dto/update-profile-skills.dto.js';
import { ProfileRepository } from './repositories/profile.repository.js';
import { PublicProfile, PublicProfileSearchResult } from './types/profile.types.js';

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
  const pdfParseModule = (await import('pdf-parse')) as unknown as {
    default?: (buffer: Buffer) => Promise<{ text: string }>;
    (buffer: Buffer): Promise<{ text: string }>;
  };

  const parser = pdfParseModule.default ?? (pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string }>);
  const result = await parser(file.buffer as Buffer);
  return typeof result.text === 'string' ? result.text.trim() : '';
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
  ): Promise<string[]> {
    const aiUrl = process.env.AI_SERVICE_URL;

    if (!aiUrl) {
      throw new BadGatewayError('AI service not configured');
    }

    let extractedText = '';

    if (input.file) {
      extractedText = await extractTextFromPdf(input.file);
      if (!extractedText) {
        throw new BadRequestError('No se pudo extraer texto del archivo PDF');
      }
    }

    const combinedText = [input.text?.trim(), extractedText].filter(Boolean).join('\n\n');

    if (!combinedText) {
      throw new BadRequestError('Text is required to suggest skills');
    }

    const cleanedText = sanitizeAiPrompt(combinedText);
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
      timeout: 10000
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
    }).catch(() => {
      throw new BadGatewayError('AI service unreachable');
    });

    if (!resp || resp.statusCode >= 500) {
      throw new BadGatewayError('AI service error');
    }

    if (resp.statusCode >= 400) {
      throw new BadGatewayError('AI service returned an error');
    }

    const skills = resp.body && resp.body.skills ? resp.body.skills : [];

    if (!Array.isArray(skills)) {
      throw new BadGatewayError('Invalid response from AI service');
    }

    return skills as string[];
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

  public async searchUsers(filters: SearchUsersDto): Promise<PublicProfileSearchResult[]> {
    return this.profileRepository.searchPublicProfiles(filters);
  }
}
