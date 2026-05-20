/** Perfil de usuario para el motor de matchmaking */
export interface Profile {
  id: string;
  name: string;
  skills: string[];
  experience?: string;
  availability?: string;
}

/** Requisito de habilidad para un proyecto */
export interface ProjectRequirement {
  skill: string;
  level?: string;
  priority?: 'alta' | 'media' | 'baja';
  count?: number;
}

/** Habilidad normalizada extraída de texto libre */
export interface NormalizedSkill {
  original: string;
  normalized: string;
  category?: string;
  confidence?: number;
  yearsOfExperience?: number;
}

/** Propuesta de equipo con puntuación de afinidad */
export interface TeamMatchProposal {
  memberIds: string[];
  score: number;
  reasoning: string;
}
