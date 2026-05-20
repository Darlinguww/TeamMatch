import { NextFunction, Request, Response, Router } from 'express';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { validateProjectMatchRequestDto } from './dto/project-match.dto.js';
import { MatchmakingController } from './matchmaking.controller.js';
import { MatchmakingRepository } from './matchmaking.repository.js';
import { MatchmakingService } from './matchmaking.service.js';

const router = Router();
const matchmakingRepository = new MatchmakingRepository();
const matchmakingService = new MatchmakingService(matchmakingRepository);
const matchmakingController = new MatchmakingController(matchmakingService);

function validateProjectMatchRequest(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateProjectMatchRequestDto({
    params: req.params,
    query: req.query
  });

  if (validationResult.issues.length > 0) {
    next(new BadRequestError('Validation failed', validationResult.issues));
    return;
  }

  res.locals.projectMatchRequest = validationResult.value;
  next();
}

router.get('/:id/match', validateProjectMatchRequest, matchmakingController.getProjectMatches);

export default router;
