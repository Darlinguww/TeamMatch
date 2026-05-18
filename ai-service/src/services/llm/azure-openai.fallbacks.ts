import type { MatchmakingResult } from '../matchmaking/matchmaking.types.js';
import type { SkillExtractionResult } from './azure-fallback.types.js';

/**
 * Fallback de extracción de perfil: arrays vacíos para entrada manual.
 * Forma: { skills: [], experience: [], availability: [] }
 */
export function createEmptySkillExtractionResult(): SkillExtractionResult {
  return {
    skills: [],
    experience: [],
    availability: [],
  };
}

/**
 * Fallback de matchmaking alineado con `MatchmakingResult` (contrato HTTP existente).
 * Equivalente conceptual a { teams: [], scores: [], justifications: [] } → proposals: [].
 */
export function createEmptyMatchmakingResult(projectId: string): MatchmakingResult {
  return {
    projectId,
    proposals: [],
    generatedAt: new Date().toISOString(),
  };
}
