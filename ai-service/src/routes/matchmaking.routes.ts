import { Router } from 'express';
import { generateTeamProposals } from '../controllers/matchmaking.controller.js';

const router = Router();

// POST /api/matchmaking/generate
router.post('/generate', (req, res, next) => {
  void generateTeamProposals(req, res).catch(next);
});

export default router;
