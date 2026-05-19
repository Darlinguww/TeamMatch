// Tipos del motor de matchmaking (M3)

export interface CandidateProfile {
  userId: string;
  name: string;
  skills: Array<{ name: string; level: string; category: string }>;
  experience: Array<{ role: string; years: number; skills: string[] }>;
  availability: { hoursPerWeek: number; schedule: string };
  feedbackHistory: Array<{
    collaboration: number;
    communication: number;
    technicalSkills: number;
    overallRating: number;
  }>;
}

export interface ProjectRequirements {
  projectId: string;
  projectName: string;
  description: string;
  requiredRoles: Array<{
    role: string;
    requiredSkills: string[];
    priority: "high" | "medium" | "low";
  }>;
  teamSize: number;
}

export interface TeamMemberProposal {
  userId: string;
  name: string;
  proposedRole: string;
  affinityScore: number;
  scoreBreakdown: {
    skillMatch: number;
    availability: number;
    experience: number;
    collaborationHistory: number;
  };
  justification: string;
}

export interface TeamProposal {
  proposalId: string;
  teamScore: number;
  members: TeamMemberProposal[];
  complementarityAnalysis: string;
  risks: string[];
  strengths: string[];
}

export interface MatchmakingResult {
  projectId: string;
  proposals: TeamProposal[];
  generatedAt: string;
}

/**
 * DTO de entrada para el endpoint de matchmaking.
 * Integra datos estructurados del grafo Neo4j + instrucciones libres del usuario.
 */
export interface MatchmakingRequest {
  /** Datos estructurados del proyecto desde Neo4j */
  project: ProjectRequirements;
  /** Perfiles de candidatos desde Neo4j */
  candidates: CandidateProfile[];
  /** Instrucciones complementarias del usuario (ej: "priorizar perfiles senior") */
  userInstructions?: string;
}
