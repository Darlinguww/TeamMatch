import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { validateDto } from '../../shared/middlewares/validateDto.js';
import { validateUpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { validateUpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ProfileRepository } from './repositories/profile.repository.js';

const router = Router();
const profileRepository = new ProfileRepository();
const profileService = new ProfileService(profileRepository);
const profileController = new ProfileController(profileService);

router.put(
  '/profile/experience',
  requireAuth,
  validateDto(validateUpdateProfileExperienceDto),
  profileController.updateExperience
);
router.put(
  '/profile/availability',
  requireAuth,
  validateDto(validateUpdateProfileAvailabilityDto),
  profileController.updateAvailability
);
router.get('/users/:id/profile', profileController.getPublicProfile);

export default router;
