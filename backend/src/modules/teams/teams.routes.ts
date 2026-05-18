import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { Neo4jTeamRepository } from './repositories/team.repository.js';
import { TeamService } from './team.service.js';

const router = Router();
const teamService = new TeamService(new Neo4jTeamRepository());
const MAX_ID_LENGTH = 120;

function parseRouteId(value: unknown, field: string): string {
  const id = typeof value === 'string' ? value.trim() : '';

  if (!id) {
    throw new BadRequestError(`${field} is required`);
  }

  if (id.length > MAX_ID_LENGTH) {
    throw new BadRequestError(`${field} must be ${MAX_ID_LENGTH} characters or fewer`);
  }

  return id;
}

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const team = await teamService.getTeamComposition(req.user!.userId, parseRouteId(req.params.id, 'id'));
  res.status(200).json({ team });
}));

router.put('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const result = await teamService.updateMembers(req.user!.userId, parseRouteId(req.params.id, 'id'), req.body ?? {});
  res.status(200).json(result);
}));

router.delete('/:id/members/:memberId', requireAuth, asyncHandler(async (req, res) => {
  const result = await teamService.removeMember(
    req.user!.userId,
    parseRouteId(req.params.id, 'id'),
    parseRouteId(req.params.memberId, 'memberId')
  );
  res.status(200).json(result);
}));

export default router;
