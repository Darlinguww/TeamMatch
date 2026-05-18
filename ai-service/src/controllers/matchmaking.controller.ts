import { Request, Response } from 'express';
import { runMatchmaking } from '../services/matchmaking/matchmaking.service.js';
import type {
  ProjectRequirements,
  CandidateProfile,
} from '../services/matchmaking/matchmaking.types.js';

export async function generateTeamProposals(req: Request, res: Response): Promise<void> {
  try {
    const { project, candidates } = req.body as {
      project: ProjectRequirements;
      candidates: CandidateProfile[];
    };

    if (!project || !candidates || candidates.length === 0) {
      res.status(400).json({
        error: 'Se requieren "project" y "candidates" en el body',
      });
      return;
    }

    if (candidates.length > 100) {
      res.status(400).json({
        error: 'Máximo 100 candidatos por solicitud',
      });
      return;
    }

    const result = await runMatchmaking(project, candidates);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[Matchmaking] Error:', message);
    res.status(500).json({ error: message });
  }
}
