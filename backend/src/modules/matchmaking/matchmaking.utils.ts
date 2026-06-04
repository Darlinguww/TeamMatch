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

/** Contract weights: 60% skills (incl. role fit), 20% availability, 20% reputation */
const MAX_SKILLS_SCORE = 60;
const MAX_AVAILABILITY_SCORE = 20;
const MAX_REPUTATION_SCORE = 20;
const MAX_ROLE_COVERAGE_SCORE = 0;
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

function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function skillTokens(skillName: string): string[] {
  return foldAccents(normalizeSkillName(skillName))
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

/** Groups of related keywords so long project requirements can match short profile skills. */
const SKILL_AFFINITY_GROUPS: readonly string[][] = [
  ['english', 'ingles', 'esl', 'tefl', 'toefl', 'c2', 'nativo', 'native', 'bilingual', 'bilingue', 'idioma', 'extranjero', 'foreign', 'linguist', 'lingu', 'fluency', 'fluido', 'language'],
  ['teaching', 'teacher', 'docente', 'docencia', 'pedagog', 'pedagogy', 'evaluacion', 'acompanamiento', 'education', 'educacion', 'profesor', 'profesora', 'tutor', 'classroom'],
  ['writing', 'research', 'translation', 'history', 'philosophy', 'literature', 'communication', 'humanities'],
  ['social', 'community', 'counseling', 'psychology', 'volunteering', 'case management'],
  ['project management', 'scrum', 'agile', 'leadership', 'planning', 'product management'],
  ['seo', 'marketing', 'copywriting', 'analytics', 'branding', 'campaign']
];

function sharesAffinityGroup(requiredSkill: string, candidateSkill: string): boolean {
  const requiredText = foldAccents(normalizeSkillName(requiredSkill));
  const candidateText = foldAccents(normalizeSkillName(candidateSkill));
  const requiredTokens = skillTokens(requiredSkill);
  const candidateTokens = skillTokens(candidateSkill);

  return SKILL_AFFINITY_GROUPS.some((group) => {
    const requiredMatches = group.some((keyword) => (
      requiredText.includes(keyword)
      || requiredTokens.some((token) => token.includes(keyword) || keyword.includes(token))
    ));
    const candidateMatches = group.some((keyword) => (
      candidateText.includes(keyword)
      || candidateTokens.some((token) => token.includes(keyword) || keyword.includes(token))
    ));

    return requiredMatches && candidateMatches;
  });
}

export function skillsAreEquivalent(requiredSkill: string, candidateSkill: string): boolean {
  const required = normalizeSkillName(requiredSkill);
  const candidate = normalizeSkillName(candidateSkill);

  if (!required || !candidate) {
    return false;
  }

  if (required === candidate) {
    return true;
  }

  const requiredFolded = foldAccents(required);
  const candidateFolded = foldAccents(candidate);

  if (requiredFolded === candidateFolded) {
    return true;
  }

  const requiredTokens = skillTokens(requiredSkill);
  const candidateTokens = skillTokens(candidateSkill);
  const sharedTokens = requiredTokens.filter((token) => candidateTokens.includes(token));

  if (sharedTokens.length >= 2) {
    return true;
  }

  if (sharesAffinityGroup(requiredSkill, candidateSkill)) {
    return true;
  }

  return false;
}

function isRequiredSkillCovered(requiredSkill: string, candidateSkills: string[]): boolean {
  return candidateSkills.some((candidateSkill) => skillsAreEquivalent(requiredSkill, candidateSkill));
}

function getRequiredSkills(roles: MatchmakingRoleRequirement[]): string[] {
  return uniqueValues(roles.flatMap((role) => role.requiredSkills.map(normalizeSkillName)).filter(Boolean));
}

function getCandidateSkills(candidate: MatchmakingCandidate | MatchmakingTeamMember): string[] {
  const fromExperience = candidate.experience.map((item) => normalizeSkillName(item.skillName)).filter(Boolean);
  const fromProfile = 'profileSkills' in candidate
    ? candidate.profileSkills.map(normalizeSkillName).filter(Boolean)
    : [];

  return uniqueValues([...fromExperience, ...fromProfile]);
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
  const coveredRequiredSkills = requiredSkills.filter((skill) => isRequiredSkillCovered(skill, candidateSkills));
  const coveredRoles = roles
    .filter((role) => role.requiredSkills.some((skill) => isRequiredSkillCovered(skill, candidateSkills)))
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
    const hasAnySlot = candidate.availability.some((day) => day.timeSlots.length > 0);
    return hasAnySlot ? MAX_AVAILABILITY_SCORE : 0;
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

function scoreSkillsWithRoleFit(coverage: MatchmakingCoverageSummary, roles: MatchmakingRoleRequirement[]): number {
  if (coverage.totalRequiredSkills === 0) {
    return 0;
  }

  const skillCoverageRatio = coverage.coveredRequiredSkills.length / coverage.totalRequiredSkills;
  const roleCoverageRatio = roles.length === 0 ? 0 : coverage.coveredRoles.length / roles.length;

  return roundScore(((skillCoverageRatio * 0.75) + (roleCoverageRatio * 0.25)) * MAX_SKILLS_SCORE);
}

function scoreRoleCoverage(coverage: MatchmakingCoverageSummary, roles: MatchmakingRoleRequirement[]): number {
  if (MAX_ROLE_COVERAGE_SCORE === 0) {
    return 0;
  }

  return scoreSkillsWithRoleFit(coverage, roles);
}

function getMatchingCategories(candidate: MatchmakingCandidate, coveredSkills: string[]): SkillCategory[] {
  return Array.from(new Set(candidate.experience
    .filter((item) => coveredSkills.some((covered) => skillsAreEquivalent(covered, item.skillName)))
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

function normalizeRoleLabel(roleName: string): string {
  return roleName
    .replace(/\s*#\d+\s*$/i, '')
    .replace(/\s*\(×\d+\)\s*$/i, '')
    .trim();
}

/** Mirrors frontend `scoreMatchForRole` so open-project cards match owner recommendations. */
export function scoreMatchForRoleFit(
  result: Pick<MatchmakingResult, 'score' | 'coverage'>,
  roleName: string
): number {
  const target = normalizeRoleLabel(roleName).toLowerCase();

  if (!target) {
    return result.score;
  }

  let bonus = 0;

  if (
    result.coverage.coveredRoles.some(
      (role) => normalizeRoleLabel(role).toLowerCase() === target
    )
  ) {
    bonus += 25;
  }

  if (
    result.coverage.coveredRequiredSkills.some(
      (skill) => target.includes(skill.toLowerCase()) || skill.toLowerCase().includes(target)
    )
  ) {
    bonus += 10;
  }

  return roundScore(clamp(result.score + bonus, 0, 100));
}

/** Best role-fit score for a user browsing open projects (same number the owner sees). */
export function scoreDiscoveryAgainstProject(
  result: MatchmakingResult,
  roles: MatchmakingRoleRequirement[]
): number {
  if (roles.length === 0) {
    return result.score;
  }

  let bestScore = result.score;

  for (const role of roles) {
    const roleScore = scoreMatchForRoleFit(result, role.name);
    if (roleScore > bestScore) {
      bestScore = roleScore;
    }
  }

  return bestScore;
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
  const skillsScore = scoreSkillsWithRoleFit(coverage, roles);
  const breakdown: MatchmakingScoreBreakdown = {
    skills: skillsScore,
    availability: scoreAvailability(candidate, options),
    reputation: roundScore(clamp(candidate.reputationScore, 0, 1) * MAX_REPUTATION_SCORE),
    roleCoverage: scoreRoleCoverage(coverage, roles),
    categoryDomain: scoreCategoryDomain(matchingCategories, domainWeights),
    redundancyPenalty: scoreRedundancy(coverage.coveredRequiredSkills, teamMembers),
    experienceBalance: scoreExperienceBalance(candidate, teamMembers)
  };
  let score = roundScore(clamp(
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

  if (coverage.totalRequiredSkills > 0 && coverage.coveredRequiredSkills.length === 0) {
    score = Math.min(score, 25);
  }

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
