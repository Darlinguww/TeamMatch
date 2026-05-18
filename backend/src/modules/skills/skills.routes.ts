import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { skillsCatalogWriteRateLimiter } from '../../shared/middlewares/rateLimit.js';
import { requireSkillsAdmin } from '../../shared/middlewares/requireSkillsAdmin.js';
import { validateDto } from '../../shared/middlewares/validateDto.js';
import { validateCreateSkillDto, validateUpdateSkillDto } from './dto/skill.dto.js';
import { SkillController } from './skill.controller.js';
import { SkillService } from './skill.service.js';
import { SkillRepository } from './repositories/skill.repository.js';

const router = Router();
const skillRepository = new SkillRepository();
const skillService = new SkillService(skillRepository);
const skillController = new SkillController(skillService);

router.get('/skills', skillController.list);
router.get('/skills/:id', skillController.get);
router.post(
  '/skills',
  requireAuth,
  requireSkillsAdmin,
  skillsCatalogWriteRateLimiter,
  validateDto(validateCreateSkillDto),
  skillController.create
);
router.put(
  '/skills/:id',
  requireAuth,
  requireSkillsAdmin,
  skillsCatalogWriteRateLimiter,
  validateDto(validateUpdateSkillDto),
  skillController.update
);
router.delete(
  '/skills/:id',
  requireAuth,
  requireSkillsAdmin,
  skillsCatalogWriteRateLimiter,
  skillController.delete
);

export default router;
