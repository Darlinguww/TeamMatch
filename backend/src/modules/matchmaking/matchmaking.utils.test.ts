import { describe, expect, it } from 'vitest';
import { scoreMatchmakingCandidate } from './matchmaking.utils.js';
import type { MatchmakingCandidate, MatchmakingRoleRequirement } from './matchmaking.types.js';

const roles: MatchmakingRoleRequirement[] = [
  { name: 'Frontend', requiredSkills: ['react'] }
];

function buildCandidate(overrides: Partial<MatchmakingCandidate> = {}): MatchmakingCandidate {
  return {
    userId: 'c1',
    user: 'Candidate',
    experience: [{ skillName: 'React', yearsOfExperience: 3, level: 'advanced', category: 'frontend' }],
    availability: [{ day: 'monday', timeSlots: [{ start: '09:00', end: '17:00' }] }],
    reputationScore: 0.8,
    ...overrides
  };
}

describe('matchmaking.utils — pesos 60/20/20', () => {
  it('asigna hasta 60 puntos por habilidades y rol', () => {
    const result = scoreMatchmakingCandidate(buildCandidate(), roles, [], {});

    expect(result.breakdown.skills).toBeLessThanOrEqual(60);
    expect(result.breakdown.skills).toBeGreaterThan(0);
  });

  it('asigna 20 puntos por disponibilidad compatible', () => {
    const result = scoreMatchmakingCandidate(buildCandidate(), roles, [], {
      availability: { day: 'monday', start: '10:00', end: '12:00' }
    });

    expect(result.breakdown.availability).toBe(20);
  });

  it('asigna 20 puntos por reputacion al 100%', () => {
    const result = scoreMatchmakingCandidate(buildCandidate({ reputationScore: 1 }), roles, [], {});

    expect(result.breakdown.reputation).toBe(20);
  });

  it('penaliza habilidades redundantes en el equipo', () => {
    const duplicateReactMember = {
      userId: 'm1',
      user: 'Member',
      experience: [{ skillName: 'React', yearsOfExperience: 4, level: 'expert', category: 'frontend' }]
    };
    const withPenalty = scoreMatchmakingCandidate(buildCandidate(), roles, [
      duplicateReactMember,
      { ...duplicateReactMember, userId: 'm2', user: 'Member 2' }
    ], {});

    const withoutPenalty = scoreMatchmakingCandidate(buildCandidate(), roles, [], {});

    expect(withPenalty.breakdown.redundancyPenalty).toBeLessThan(0);
    expect(withPenalty.score).toBeLessThan(withoutPenalty.score);
  });

  it('sube el score cuando aumenta la reputacion', () => {
    const low = scoreMatchmakingCandidate(buildCandidate({ reputationScore: 0.2 }), roles, [], {});
    const high = scoreMatchmakingCandidate(buildCandidate({ reputationScore: 0.9 }), roles, [], {});

    expect(high.breakdown.reputation).toBeGreaterThan(low.breakdown.reputation);
    expect(high.score).toBeGreaterThan(low.score);
  });
});
