import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { RemoveTeamMemberParamsDto, TeamIdParamsDto, validateRemoveTeamMemberParams, validateTeamIdParams } from './dto/team-params.dto.js';
import { Neo4jTeamRepository } from './repositories/team.repository.js';
import { TeamDetailRepository } from './repositories/team-detail.repository.js';
import { TeamService } from './team.service.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

const router = Router();
const teamService = new TeamService(new Neo4jTeamRepository());
const teamsService = new TeamsService(new TeamDetailRepository());
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

router.put('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const result = await teamService.updateMembers(req.user!.userId, req.params.id, req.body ?? {});
  res.status(200).json(result);
}));

export default router;
