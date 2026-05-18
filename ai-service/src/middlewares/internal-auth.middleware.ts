import { NextFunction, Request, Response } from 'express';
import { getRequiredEnv } from '../config/env.js';

const HEADER_NAME = 'x-internal-service-token';

export function requireInternalServiceToken(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = getRequiredEnv('INTERNAL_AI_SERVICE_TOKEN');
  const providedToken = req.header(HEADER_NAME)?.trim() ?? '';

  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: 'No autorizado: token de servicio interno inválido o ausente.' });
    return;
  }

  next();
}
