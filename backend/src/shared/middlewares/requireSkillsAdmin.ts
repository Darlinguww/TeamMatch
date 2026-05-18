import { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import { ForbiddenError } from '../errors/HttpErrors.js';

export function requireSkillsAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    const allowedEmails = env.skillsAdminEmails.map((email) => email.toLowerCase());
    const actorEmail = req.user?.email?.toLowerCase() ?? '';

    if (allowedEmails.length === 0) {
      if (!isProduction) {
        next();
        return;
      }

      throw new ForbiddenError(
        'Catálogo de habilidades restringido: configure SKILLS_ADMIN_EMAILS en producción'
      );
    }

    if (!actorEmail || !allowedEmails.includes(actorEmail)) {
      throw new ForbiddenError('Solo administradores pueden gestionar el catálogo de habilidades');
    }

    next();
  } catch (error) {
    next(error);
  }
}
