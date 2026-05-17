import { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { UpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
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

  public getPublicProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const profile = await this.profileService.getPublicProfile(req.params.id);
    res.status(200).json({ profile });
  });
}
