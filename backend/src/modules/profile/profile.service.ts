import pdfParse from 'pdf-parse';
import { env } from '../../config/env.js';
import {
  BadGatewayError,
  BadRequestError,
  NotFoundError
} from '../../shared/errors/HttpErrors.js';
import {
  assertNoMaliciousFileContent,
  sanitizeAiPrompt
} from '../../shared/security/prompt-injection.js';
import { SearchUsersDto } from './dto/search-users.dto.js';
import { UpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { UpdateProfileSkillsDto } from './dto/update-profile-skills.dto.js';
import { ProfileRepository } from './repositories/profile.repository.js';
import { PublicProfile, PublicProfileSearchResult } from './types/profile.types.js';

interface ProcessSkillsResponse {
  skills?: Array<{ normalized?: string; original?: string }>;
}

function buildAiServiceEndpoint(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
}

async function extractPdfText(file: Express.Multer.File): Promise<string> {
  const parsePromise = pdfParse(file.buffer);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new BadRequestError('PDF processing timeout')), env.processingTimeoutMs);
  });

  const parsed = await Promise.race([parsePromise, timeoutPromise]);

  if (parsed.numpages > env.maxPdfPages) {
    throw new BadRequestError(`PDF exceeds maximum of ${env.maxPdfPages} pages`);
  }

  const text = parsed.text?.trim() ?? '';

  if (!text) {
    throw new BadRequestError('Could not extract text from PDF');
  }

  return text;
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
    const textParts: string[] = [];

    if (input.text?.trim()) {
      textParts.push(sanitizeAiPrompt(input.text));
    }

    if (input.file) {
      assertNoMaliciousFileContent(input.file.buffer);
      const pdfText = await extractPdfText(input.file);
      textParts.push(sanitizeAiPrompt(pdfText));
    }

    const analysisText = textParts.join('\n\n').trim();

    if (!analysisText) {
      throw new BadRequestError('Either text or a PDF file is required');
    }

    if (analysisText.length > env.maxSuggestSkillsTextLength) {
      throw new BadRequestError(
        `Text exceeds maximum of ${env.maxSuggestSkillsTextLength} characters for skill suggestions`
      );
    }

    if (!env.aiServiceUrl) {
      throw new BadGatewayError('AI service not configured');
    }

    const endpoint = buildAiServiceEndpoint(env.aiServiceUrl, '/api/ai/process-skills');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.processingTimeoutMs);

    let response: Response;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (env.internalAiServiceToken) {
        headers['X-Internal-Service-Token'] = env.internalAiServiceToken;
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: analysisText }),
        signal: controller.signal
      });
    } catch {
      throw new BadGatewayError('AI service unreachable');
    } finally {
      clearTimeout(timeout);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      throw new BadGatewayError('Invalid response from AI service');
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : 'AI service error';
      throw new BadGatewayError(message);
    }

    const parsed = body as ProcessSkillsResponse;

    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      throw new BadGatewayError('Invalid response from AI service');
    }

    return parsed.skills
      .map((skill) => skill.normalized?.trim() || skill.original?.trim() || '')
      .filter(Boolean);
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
