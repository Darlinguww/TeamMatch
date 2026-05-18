import { Request, Response } from 'express';
import { runMatchmaking } from '../services/matchmaking/matchmaking.service.js';
import { validateMatchmakingRequest } from '../services/matchmaking/matchmaking.validation.js';

export async function generateTeamProposals(req: Request, res: Response): Promise<void> {
  const { project, candidates } = validateMatchmakingRequest(req.body);
  const result = await runMatchmaking(project, candidates);
  res.status(200).json(result);
}
