import { BadRequestError, NotFoundError, BadGatewayError } from '../../shared/errors/HttpErrors.js';
import { SearchUsersDto } from './dto/search-users.dto.js';
import { UpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { UpdateProfileSkillsDto } from './dto/update-profile-skills.dto.js';
import { ProfileRepository } from './repositories/profile.repository.js';
import { PublicProfile, PublicProfileSearchResult } from './types/profile.types.js';

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
    const aiUrl = process.env.AI_SERVICE_URL; // TODO: ensure that this is the required url for the ai service

    if (!aiUrl) {
      throw new BadGatewayError('AI service not configured');
    }

    const payload: Record<string, unknown> = {};

    if (input.text) payload.text = input.text;
    if (input.file) {
      payload.file = {
        name: input.file.originalname,
        mimetype: input.file.mimetype,
        data: input.file.buffer.toString('base64')
      };
    }

    // Forward to ai-service. Implementation details depend on ai-service contract.
    // TODO: adapt payload and headers to actual ai-service/Gemini integration.
    const parsedUrl = new URL(aiUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? await import('https') : await import('http');

    const body = JSON.stringify(payload);

    const options: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ''),
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
          } catch (err) {
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

    // Expecting ai-service to return { suggestions: string[] }
    const suggestions = resp.body && resp.body.suggestions ? resp.body.suggestions : [];

    if (!Array.isArray(suggestions)) {
      throw new BadGatewayError('Invalid response from AI service');
    }

    return suggestions as string[];
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
