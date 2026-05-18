import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { RemoveTeamMemberParamsDto, TeamIdParamsDto, validateRemoveTeamMemberParams, validateTeamIdParams } from './dto/team-params.dto.js';
import { TeamRepository } from './repositories/team.repository.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

const router = Router();
const teamRepository = new TeamRepository();
const teamsService = new TeamsService(teamRepository);
const teamsController = new TeamsController(teamsService);

function validateTeamParams(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateTeamIdParams(req.params);

  if (validationResult.issues.length > 0) {
    next(new BadRequestError('Validation failed', validationResult.issues));
    return;
  }

  res.locals.teamParams = validationResult.value satisfies TeamIdParamsDto;
  next();
}

function validateRemoveMemberParams(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateRemoveTeamMemberParams(req.params);

  if (validationResult.issues.length > 0) {
    next(new BadRequestError('Validation failed', validationResult.issues));
    return;
  }

  res.locals.removeTeamMemberParams = validationResult.value satisfies RemoveTeamMemberParamsDto;
  next();
}

router.get('/:id', requireAuth, validateTeamParams, teamsController.getTeamComposition);
router.delete('/:id/members/:memberId', requireAuth, validateRemoveMemberParams, teamsController.removeMember);

export default router;
