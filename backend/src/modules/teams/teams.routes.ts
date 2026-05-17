import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { Neo4jTeamRepository } from './repositories/team.repository.js';
import { TeamService } from './team.service.js';

const router = Router();
const teamService = new TeamService(new Neo4jTeamRepository());

router.put('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const result = await teamService.updateMembers(req.user!.userId, req.params.id, req.body ?? {});
  res.status(200).json(result);
}));

export default router;
