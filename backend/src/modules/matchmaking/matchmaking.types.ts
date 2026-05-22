import type { AvailabilityDay, ProfileSearchDomainWeights, SkillCategory } from '../profile/types/profile.types.js';

// Estructura de experiencia alineada con las funciones de serialización del Repositorio
export interface SkillExperience {
  skillName: string; 
  category: SkillCategory;
  yearsOfExperience: number;
  level: string | null;
}

export interface MatchmakingRoleRequirement {
  roleId: string;
  name: string;
  requiredSkills: string[];
}

export interface MatchmakingTeamMember {
  userId: string;
  experience: SkillExperience[];
}

export interface MatchmakingCandidate {
  userId: string;
  user: string;
  experience: SkillExperience[];
  /** Skills from [:TIENE_HABILIDAD] (profile); merged with experience for scoring (SCRUM Phase 1). */
  profileSkills: string[];
  availability: AvailabilityDay[];
  reputationScore: number;
}

export interface OpenProjectRecommendation {
  projectId: string;
  title: string;
  score: number;
}

export interface MatchmakingProjectContext {
  projectId: string;
  title: string;
  roles: MatchmakingRoleRequirement[];
  teamMembers: MatchmakingTeamMember[];
  candidates: MatchmakingCandidate[];
}

export interface MatchmakingAvailabilityRequirement {
  day: AvailabilityDay['day'];
  start: string;
  end: string;
}

export interface MatchmakingOptions {
  includeProjectMembers?: boolean;
  availability?: MatchmakingAvailabilityRequirement | null;
}

export interface MatchmakingPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface MatchmakingScoreBreakdown {
  skills: number;
  availability: number;
  reputation: number;
  roleCoverage: number;
  categoryDomain: number;
  redundancyPenalty: number;
  experienceBalance: number;
}

export interface MatchmakingCoverageSummary {
  coveredRequiredSkills: string[];
  missingRequiredSkills: string[];
  coveredRoles: string[];
  totalRequiredSkills: number;
}

export interface MatchmakingResult {
  userId: string;
  user: string;
  score: number;
  breakdown: MatchmakingScoreBreakdown;
  coverage: MatchmakingCoverageSummary;
  matchingCategories: SkillCategory[];
  domainWeights: ProfileSearchDomainWeights;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'unknown';
  reputationScore: number;
  isNeutralCandidate: boolean;
  reasons: string[];
}

export interface ProjectMatchmakingResult {
  projectId: string;
  title: string;
  roles: MatchmakingRoleRequirement[];
  matches: MatchmakingResult[];
}

export interface ProjectMatchmakingPage {
  projectId: string;
  matches: MatchmakingResult[];
  pagination: MatchmakingPagination;
}
