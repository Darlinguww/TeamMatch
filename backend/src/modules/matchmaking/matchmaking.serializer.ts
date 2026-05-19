import type { MatchmakingResult, ProjectMatchmakingPage } from './matchmaking.types.js';

function serializeMatch(match: MatchmakingResult): MatchmakingResult {
  return {
    userId: match.userId,
    user: match.user,
    score: match.score,
    breakdown: {
      skills: match.breakdown.skills,
      availability: match.breakdown.availability,
      reputation: match.breakdown.reputation,
      roleCoverage: match.breakdown.roleCoverage,
      categoryDomain: match.breakdown.categoryDomain,
      redundancyPenalty: match.breakdown.redundancyPenalty,
      experienceBalance: match.breakdown.experienceBalance
    },
    coverage: {
      coveredRequiredSkills: match.coverage.coveredRequiredSkills,
      missingRequiredSkills: match.coverage.missingRequiredSkills,
      coveredRoles: match.coverage.coveredRoles,
      totalRequiredSkills: match.coverage.totalRequiredSkills
    },
    matchingCategories: match.matchingCategories,
    domainWeights: match.domainWeights,
    experienceLevel: match.experienceLevel,
    reputationScore: match.reputationScore,
    isNeutralCandidate: match.isNeutralCandidate,
    reasons: match.reasons
  };
}

export function serializeProjectMatchmakingPage(page: ProjectMatchmakingPage): ProjectMatchmakingPage {
  return {
    projectId: page.projectId,
    matches: page.matches.map(serializeMatch),
    pagination: {
      limit: page.pagination.limit,
      offset: page.pagination.offset,
      total: page.pagination.total
    }
  };
}
