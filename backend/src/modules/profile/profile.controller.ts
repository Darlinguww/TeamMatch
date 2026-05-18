import { Request, Response } from 'express';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { SearchUsersDto } from './dto/search-users.dto.js';
import { UpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { UpdateProfileSkillsDto } from './dto/update-profile-skills.dto.js';
import { ProfileService } from './profile.service.js';

export class ProfileController {
  public constructor(private readonly profileService: ProfileService) {}

  public updateExperience = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const profile = await this.profileService.updateExperience(
      req.user.userId,
      req.body as UpdateProfileExperienceDto
    );

    res.status(200).json({ profile });
  });

  public updateAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const profile = await this.profileService.updateAvailability(
      req.user.userId,
      req.body as UpdateProfileAvailabilityDto
    );

    res.status(200).json({ profile });
  });

  public updateSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const profile = await this.profileService.updateSkills(
      req.user.userId,
      req.body as UpdateProfileSkillsDto
    );

    res.status(200).json({ profile });
  });

  public suggestSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const text = (req.body && (req.body.text || req.body.description)) as string | undefined;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!text?.trim() && !file) {
      throw new BadRequestError('Either text or a PDF file is required');
    }

    const suggestions = await this.profileService.suggestSkills(req.user.userId, { text, file });

    res.status(200).json({ suggestions });
  });

  public getPublicProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const profile = await this.profileService.getPublicProfile(req.params.id);
    res.status(200).json({ profile });
  });

  public searchUsers = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const searchQuery = res.locals.searchUsersQuery as SearchUsersDto | undefined;

    if (!searchQuery) {
      throw new BadRequestError('Search query validation is required');
    }

    const users = await this.profileService.searchUsers(searchQuery);

    res.status(200).json({
      users,
      pagination: {
        limit: searchQuery.limit,
        offset: searchQuery.offset,
        returned: users.length
      }
    });
  });
}
