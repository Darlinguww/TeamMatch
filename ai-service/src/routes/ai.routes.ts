import { Router, Request, Response, NextFunction } from 'express';
import { matchTeams, processSkills } from '../services/gemini.service.js';
import type { Profile, ProjectRequirement } from '../types/ai.types.js';

const router = Router();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    isNonEmptyString(profile.id) &&
    isNonEmptyString(profile.name) &&
    Array.isArray(profile.skills) &&
    profile.skills.every((s) => typeof s === 'string')
  );
}

function isValidRequirement(value: unknown): value is ProjectRequirement {
  if (typeof value !== 'object' || value === null) return false;
  const req = value as Record<string, unknown>;
  if (!isNonEmptyString(req.skill)) return false;
  if (req.priority !== undefined && !['alta', 'media', 'baja'].includes(req.priority as string)) {
    return false;
  }
  if (req.count !== undefined && (typeof req.count !== 'number' || req.count < 1)) {
    return false;
  }
  return true;
}

/** Envuelve handlers async para propagar errores al middleware */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}

/**
 * POST /api/ai/process-skills
 * Body: { text: string }
 */
router.post(
  '/process-skills',
  asyncHandler(async (req, res) => {
    const { text } = req.body as { text?: unknown };

    if (!isNonEmptyString(text)) {
      res.status(400).json({
        error: 'El campo "text" es obligatorio y debe ser una cadena no vacía.',
      });
      return;
    }

    const skills = await processSkills(text.trim());
    res.json({ skills });
  }),
);

/**
 * POST /api/ai/match-teams
 * Body: { profiles: Profile[], requirements: ProjectRequirement[] }
 */
router.post(
  '/match-teams',
  asyncHandler(async (req, res) => {
    const { profiles, requirements } = req.body as {
      profiles?: unknown;
      requirements?: unknown;
    };

    if (!Array.isArray(profiles) || profiles.length === 0) {
      res.status(400).json({
        error: 'El campo "profiles" es obligatorio y debe ser un arreglo no vacío.',
      });
      return;
    }

    if (!profiles.every(isValidProfile)) {
      res.status(400).json({
        error:
          'Cada perfil debe incluir "id", "name" y "skills" (arreglo de strings).',
      });
      return;
    }

    if (!Array.isArray(requirements) || requirements.length === 0) {
      res.status(400).json({
        error:
          'El campo "requirements" es obligatorio y debe ser un arreglo no vacío.',
      });
      return;
    }

    if (!requirements.every(isValidRequirement)) {
      res.status(400).json({
        error:
          'Cada requisito debe incluir "skill". "priority" opcional: alta|media|baja. "count" opcional: número >= 1.',
      });
      return;
    }

    const proposals = await matchTeams(profiles, requirements);
    res.json({ proposals });
  }),
);

export default router;
