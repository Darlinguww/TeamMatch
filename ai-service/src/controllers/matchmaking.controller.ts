import { Request, Response } from 'express';
import { runMatchmaking } from '../services/matchmaking/matchmaking.service.js';
import type { MatchmakingRequest } from '../services/matchmaking/matchmaking.types.js';

/**
 * Endpoint: POST /api/matchmaking
 *
 * Integra datos del grafo Neo4j (proyecto + candidatos) con instrucciones
 * complementarias del usuario para generar propuestas de equipos óptimas.
 * La IA recibe ambas fuentes de información de forma estructurada.
 */
export async function generateTeamProposals(req: Request, res: Response): Promise<void> {
  try {
    const { project, candidates, userInstructions } = req.body as MatchmakingRequest;

    // Validación: datos obligatorios del grafo
    if (!project || !candidates || candidates.length === 0) {
      res.status(400).json({
        error: 'Se requieren "project" y "candidates" (estructura del grafo Neo4j) en el body',
      });
      return;
    }

    // Límite de candidatos por solicitud
    if (candidates.length > 100) {
      res.status(400).json({
        error: 'Máximo 100 candidatos por solicitud',
      });
      return;
    }

    // Validación opcional: instrucciones del usuario no deben superar 1000 caracteres
    if (userInstructions && userInstructions.length > 1000) {
      res.status(400).json({
        error: 'Las instrucciones del usuario no pueden exceder 1000 caracteres',
      });
      return;
    }

    // Ejecutar matchmaking con DTO completo
    const result = await runMatchmaking({
      project,
      candidates,
      userInstructions: userInstructions?.trim() || undefined,
    });
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[Matchmaking] Error inesperado:', message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
