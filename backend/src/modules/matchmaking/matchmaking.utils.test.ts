import { describe, expect, it } from 'vitest';
import { scoreDiscoveryAgainstProject, scoreMatchmakingCandidate } from './matchmaking.utils.js';
import type { MatchmakingCandidate, MatchmakingRoleRequirement } from './matchmaking.types.js';

const roles: MatchmakingRoleRequirement[] = [
  { name: 'Frontend', requiredSkills: ['react'] }
];

function buildCandidate(overrides: Partial<MatchmakingCandidate> = {}): MatchmakingCandidate {
  return {
    userId: 'c1',
    user: 'Candidate',
    experience: [{ skillName: 'React', yearsOfExperience: 3, level: 'advanced', category: 'frontend' }],
    profileSkills: [],
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

  it('cuenta habilidades de perfil aunque no haya experiencia en el grafo', () => {
    const result = scoreMatchmakingCandidate(
      buildCandidate({ experience: [], profileSkills: ['React'] }),
      roles,
      [],
      {}
    );

    expect(result.breakdown.skills).toBeGreaterThan(0);
    expect(result.coverage.coveredRequiredSkills).toContain('react');
  });

  it('otorga disponibilidad base cuando el candidato tiene slots y no hay requisito horario', () => {
    const result = scoreMatchmakingCandidate(buildCandidate(), roles, [], {});

    expect(result.breakdown.availability).toBe(20);
  });

  it('limita el score total si no cubre ninguna habilidad requerida', () => {
    const result = scoreMatchmakingCandidate(
      buildCandidate({ experience: [], profileSkills: [], availability: [] }),
      roles,
      [],
      {}
    );

    expect(result.coverage.coveredRequiredSkills).toHaveLength(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('alinea el score de descubrimiento con el bonus por rol del modal de equipo', () => {
    const bilingualRoles: MatchmakingRoleRequirement[] = [
      {
        roleId: 'coord',
        name: 'Coordinador(a) de Bilingüismo',
        requiredSkills: ['dominio nativo o c2 del idioma extranjero']
      }
    ];

    const base = scoreMatchmakingCandidate(
      buildCandidate({
        experience: [{ skillName: 'Inglés', yearsOfExperience: 8, level: 'expert', category: 'other' }]
      }),
      bilingualRoles,
      [],
      {}
    );
    const discovery = scoreDiscoveryAgainstProject(base, bilingualRoles);

    expect(base.coverage.coveredRoles).toContain('Coordinador(a) de Bilingüismo');
    expect(discovery).toBeGreaterThan(base.score);
    expect(discovery).toBeLessThanOrEqual(100);
  });

  it('relaciona requisitos largos de idioma con habilidades cortas del perfil', () => {
    const englishProjectRoles: MatchmakingRoleRequirement[] = [
      {
        roleId: 'lang-teacher',
        name: 'Docente de idiomas',
        requiredSkills: [
          'Dominio nativo o C2 del idioma extranjero',
          'Evaluación pedagógica y acompañamiento docente'
        ]
      }
    ];

    const result = scoreMatchmakingCandidate(
      buildCandidate({
        experience: [{ skillName: 'Inglés', yearsOfExperience: 8, level: 'expert', category: 'other' }],
        profileSkills: ['Evaluación pedagógica']
      }),
      englishProjectRoles,
      [],
      {}
    );

    expect(result.coverage.coveredRequiredSkills.length).toBeGreaterThanOrEqual(2);
    expect(result.breakdown.skills).toBeGreaterThan(30);
    expect(result.score).toBeGreaterThan(50);
  });

  it('no confunde la habilidad "r" con React', () => {
    const result = scoreMatchmakingCandidate(
      buildCandidate({
        experience: [],
        profileSkills: ['Bash', 'r', 'SQL'],
        availability: [{ day: 'monday', timeSlots: [{ start: '09:00', end: '17:00' }] }]
      }),
      roles,
      [],
      {}
    );

    expect(result.coverage.coveredRequiredSkills).not.toContain('react');
    expect(result.breakdown.skills).toBe(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });
});
