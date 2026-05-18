import type { ProfileSearchDomainWeights, SkillCategory } from '../profile/types/profile.types.js';
import type {
  MatchmakingCandidate,
  MatchmakingCoverageSummary,
  MatchmakingOptions,
  MatchmakingResult,
  MatchmakingRoleRequirement,
  MatchmakingScoreBreakdown,
  MatchmakingTeamMember
} from './matchmaking.types.js';

const MAX_SKILLS_SCORE = 40;
const MAX_AVAILABILITY_SCORE = 20;
const MAX_REPUTATION_SCORE = 20;
const MAX_ROLE_COVERAGE_SCORE = 20;
const MAX_CATEGORY_DOMAIN_SCORE = 5;
const MAX_REDUNDANCY_PENALTY = 10;
const MAX_EXPERIENCE_BALANCE_SCORE = 5;

const DOMAIN_SKILLS: Record<string, string[]> = {
  frontend: ['react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript'],
  backend: ['node.js', 'nodejs', 'express', 'spring', 'django', 'java'],
  mobile: ['flutter', 'react native', 'kotlin', 'swift'],
  ai: ['python', 'tensorflow', 'pytorch', 'machine learning'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp']
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeSkillName(skillName: string): string {
  return skillName.trim().toLowerCase();
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values));
}

function getRequiredSkills(roles: MatchmakingRoleRequirement[]): string[] {
  return uniqueValues(roles.flatMap((role) => role.requiredSkills.map(normalizeSkillName)).filter(Boolean));
}

function getCandidateSkills(candidate: MatchmakingCandidate | MatchmakingTeamMember): string[] {
  return uniqueValues(candidate.experience.map((item) => normalizeSkillName(item.skillName)).filter(Boolean));
}

function getAverageYears(candidate: MatchmakingCandidate | MatchmakingTeamMember): number {
  if (candidate.experience.length === 0) {
    return 0;
  }

  return candidate.experience.reduce((total, item) => total + item.yearsOfExperience, 0) / candidate.experience.length;
}

function getExperienceLevel(candidate: MatchmakingCandidate | MatchmakingTeamMember): MatchmakingResult['experienceLevel'] {
  if (candidate.experience.length === 0) {
    return 'unknown';
  }

  const averageYears = getAverageYears(candidate);

  if (averageYears < 2) {
    return 'junior';
  }

  if (averageYears < 5) {
    return 'mid';
  }

  return 'senior';
}

function buildTeamSkillCounts(teamMembers: MatchmakingTeamMember[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const member of teamMembers) {
    for (const skill of getCandidateSkills(member)) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }

  return counts;
}

function getCoverage(candidateSkills: string[], roles: MatchmakingRoleRequirement[]): MatchmakingCoverageSummary {
  const requiredSkills = getRequiredSkills(roles);
  const coveredRequiredSkills = requiredSkills.filter((skill) => candidateSkills.includes(skill));
  const coveredRoles = roles
    .filter((role) => role.requiredSkills.some((skill) => candidateSkills.includes(normalizeSkillName(skill))))
    .map((role) => role.name);

  return {
    coveredRequiredSkills,
    missingRequiredSkills: requiredSkills.filter((skill) => !coveredRequiredSkills.includes(skill)),
    coveredRoles,
    totalRequiredSkills: requiredSkills.length
  };
}

function scoreAvailability(candidate: MatchmakingCandidate, options: MatchmakingOptions): number {
  const availabilityRequirement = options.availability;

  if (!availabilityRequirement) {
    return 0;
  }

  const matchesRequirement = candidate.availability.some((dayAvailability) => (
    dayAvailability.day === availabilityRequirement.day
    && dayAvailability.timeSlots.some((slot) => (
      slot.start <= availabilityRequirement.start
      && slot.end >= availabilityRequirement.end
    ))
  ));

  return matchesRequirement ? MAX_AVAILABILITY_SCORE : 0;
}

function scoreRoleCoverage(coverage: MatchmakingCoverageSummary, roles: MatchmakingRoleRequirement[]): number {
  if (roles.length === 0 || coverage.totalRequiredSkills === 0) {
    return 0;
  }

  const skillCoverageRatio = coverage.coveredRequiredSkills.length / coverage.totalRequiredSkills;
  const roleCoverageRatio = coverage.coveredRoles.length / roles.length;

  return roundScore(((skillCoverageRatio * 0.7) + (roleCoverageRatio * 0.3)) * MAX_ROLE_COVERAGE_SCORE);
}

function getMatchingCategories(candidate: MatchmakingCandidate, coveredSkills: string[]): SkillCategory[] {
  return Array.from(new Set(candidate.experience
    .filter((item) => coveredSkills.includes(normalizeSkillName(item.skillName)))
    .map((item) => item.category)
    .filter((category) => category !== 'other')));
}

function getDomainWeights(coveredSkills: string[]): ProfileSearchDomainWeights {
  return Object.entries(DOMAIN_SKILLS).reduce<ProfileSearchDomainWeights>((weights, [domain, skills]) => {
    const weight = Math.min(coveredSkills.filter((skill) => skills.includes(skill)).length * 5, 10);

    if (weight > 0) {
      weights[domain] = weight;
    }

    return weights;
  }, {});
}

function scoreCategoryDomain(matchingCategories: SkillCategory[], domainWeights: ProfileSearchDomainWeights): number {
  const categoryScore = Math.min(matchingCategories.length, 3);
  const domainScore = Math.min(Object.values(domainWeights).reduce((total, weight) => total + weight, 0), 10) * 0.2;

  return roundScore(clamp(categoryScore + domainScore, 0, MAX_CATEGORY_DOMAIN_SCORE));
}

function scoreRedundancy(coveredSkills: string[], teamMembers: MatchmakingTeamMember[]): number {
  if (coveredSkills.length === 0 || teamMembers.length === 0) {
    return 0;
  }

  const teamSkillCounts = buildTeamSkillCounts(teamMembers);
  const redundantSkills = coveredSkills.filter((skill) => (teamSkillCounts.get(skill) ?? 0) >= 2);

  return roundScore(-Math.min((redundantSkills.length / coveredSkills.length) * MAX_REDUNDANCY_PENALTY, MAX_REDUNDANCY_PENALTY));
}

function scoreExperienceBalance(candidate: MatchmakingCandidate, teamMembers: MatchmakingTeamMember[]): number {
  const candidateLevel = getExperienceLevel(candidate);

  if (candidateLevel === 'unknown') {
    return 0;
  }

  const levels = [
    ...teamMembers.map(getExperienceLevel),
    candidateLevel
  ].filter((level) => level !== 'unknown');
  const uniqueLevels = uniqueValues(levels);

  if (uniqueLevels.length >= 3) {
    return MAX_EXPERIENCE_BALANCE_SCORE;
  }

  if (uniqueLevels.length === 2) {
    return 3;
  }

  if (uniqueLevels.length === 1) {
    return 1;
  }

  return 0;
}

function buildReasons(
  coverage: MatchmakingCoverageSummary,
  breakdown: MatchmakingScoreBreakdown,
  matchingCategories: SkillCategory[]
): string[] {
  const reasons: string[] = [];

  if (coverage.coveredRequiredSkills.length > 0) {
    reasons.push(`Cubre ${coverage.coveredRequiredSkills.length} habilidad(es) requerida(s)`);
  }

  if (coverage.coveredRoles.length > 0) {
    reasons.push(`Aporta cobertura para rol(es): ${coverage.coveredRoles.join(', ')}`);
  }

  if (matchingCategories.length > 0) {
    reasons.push(`Categorías funcionales relevantes: ${matchingCategories.join(', ')}`);
  }

  if (breakdown.redundancyPenalty < 0) {
    reasons.push('Tiene habilidades ya representadas en el equipo actual');
  }

  if (breakdown.experienceBalance >= 6) {
    reasons.push('Mejora el balance de experiencia del equipo');
  }

  return reasons;
}

export function scoreMatchmakingCandidate(
  candidate: MatchmakingCandidate,
  roles: MatchmakingRoleRequirement[],
  teamMembers: MatchmakingTeamMember[],
  options: MatchmakingOptions = {}
): MatchmakingResult {
  const candidateSkills = getCandidateSkills(candidate);
  const coverage = getCoverage(candidateSkills, roles);
  const matchingCategories = getMatchingCategories(candidate, coverage.coveredRequiredSkills);
  const domainWeights = getDomainWeights(coverage.coveredRequiredSkills);
  const skillsScore = coverage.totalRequiredSkills === 0
    ? 0
    : roundScore((coverage.coveredRequiredSkills.length / coverage.totalRequiredSkills) * MAX_SKILLS_SCORE);
  const breakdown: MatchmakingScoreBreakdown = {
    skills: skillsScore,
    availability: scoreAvailability(candidate, options),
    reputation: roundScore(clamp(candidate.reputationScore, 0, 1) * MAX_REPUTATION_SCORE),
    roleCoverage: scoreRoleCoverage(coverage, roles),
    categoryDomain: scoreCategoryDomain(matchingCategories, domainWeights),
    redundancyPenalty: scoreRedundancy(coverage.coveredRequiredSkills, teamMembers),
    experienceBalance: scoreExperienceBalance(candidate, teamMembers)
  };
  const score = roundScore(clamp(
    breakdown.skills
    + breakdown.availability
    + breakdown.reputation
    + breakdown.roleCoverage
    + breakdown.categoryDomain
    + breakdown.redundancyPenalty
    + breakdown.experienceBalance,
    0,
    100
  ));

  return {
    userId: candidate.userId,
    user: candidate.user,
    score,
    breakdown,
    coverage,
    matchingCategories,
    domainWeights,
    experienceLevel: getExperienceLevel(candidate),
    reputationScore: roundScore(clamp(candidate.reputationScore, 0, 1)),
    isNeutralCandidate: candidate.experience.length === 0,
    reasons: buildReasons(coverage, breakdown, matchingCategories)
  };
}

export function sortMatchmakingResults(results: MatchmakingResult[]): MatchmakingResult[] {
  return [...results].sort((first, second) => (
    second.score - first.score
    || second.breakdown.skills - first.breakdown.skills
    || second.breakdown.roleCoverage - first.breakdown.roleCoverage
    || first.user.toLowerCase().localeCompare(second.user.toLowerCase())
    || first.userId.localeCompare(second.userId)
  ));
}
