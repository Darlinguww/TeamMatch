/**
 * Formas vacías devueltas cuando Azure OpenAI falla.
 * Permiten registro manual en el frontend sin comprobar null/undefined.
 */

/** Extracción de perfil (habilidades, experiencia, disponibilidad) */
export interface SkillExtractionResult {
  skills: SkillExtractionItem[];
  experience: ExperienceExtractionItem[];
  availability: AvailabilityExtractionItem[];
}

export interface SkillExtractionItem {
  name: string;
  level?: string;
  category?: string;
}

export interface ExperienceExtractionItem {
  role: string;
  years?: number;
  description?: string;
}

export interface AvailabilityExtractionItem {
  schedule?: string;
  hoursPerWeek?: number;
}

/**
 * Alias documentado del fallback de matchmaking.
 * La API pública expone `proposals` dentro de `MatchmakingResult` (no teams/scores/justifications).
 */
export interface MatchmakingFallbackShape {
  teams: [];
  scores: [];
  justifications: [];
}
