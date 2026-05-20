import type { AvailabilityDay, ProfileSearchDomainWeights, SkillCategory, SkillExperience } from '../profile/types/profile.types.js';

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
  availability: AvailabilityDay[];
  reputationScore: number;
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
