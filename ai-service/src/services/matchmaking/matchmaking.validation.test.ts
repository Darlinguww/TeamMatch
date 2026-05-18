import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validateMatchmakingRequest,
  validateMatchmakingResult,
  ValidationError
} from './matchmaking.validation.js';

const validRequest = {
  project: {
    projectId: 'project-1',
    projectName: 'TeamMatch',
    description: 'Proyecto de prueba',
    teamSize: 2,
    requiredRoles: [
      {
        role: 'Backend',
        requiredSkills: ['Node.js'],
        priority: 'high'
      }
    ]
  },
  candidates: [
    {
      userId: 'user-1',
      name: 'User One',
      skills: [{ name: 'Node.js', level: 'advanced', category: 'technical' }],
      experience: [{ role: 'Developer', years: 3, skills: ['Node.js'] }],
      availability: { hoursPerWeek: 10, schedule: 'lunes tarde' },
      feedbackHistory: [
        {
          collaboration: 4,
          communication: 4,
          technicalSkills: 5,
          overallRating: 4
        }
      ]
    }
  ]
};

describe('matchmaking validation', () => {
  it('acepta solicitudes validas de matchmaking', () => {
    assert.deepEqual(validateMatchmakingRequest(validRequest), validRequest);
  });

  it('rechaza mas de 100 candidatos', () => {
    assert.throws(
      () => validateMatchmakingRequest({
        ...validRequest,
        candidates: Array.from({ length: 101 }, () => validRequest.candidates[0])
      }),
      ValidationError
    );
  });

  it('rechaza texto excesivo en datos enviados al modelo', () => {
    assert.throws(
      () => validateMatchmakingRequest({
        ...validRequest,
        project: {
          ...validRequest.project,
          description: 'x'.repeat(2001)
        }
      }),
      ValidationError
    );
  });

  it('normaliza y limita scores devueltos por Azure OpenAI', () => {
    const result = validateMatchmakingResult({
      proposals: [
        {
          proposalId: 'proposal-1',
          teamScore: 150,
          members: [
            {
              userId: 'user-1',
              name: 'User One',
              proposedRole: 'Backend',
              affinityScore: -5,
              scoreBreakdown: {
                skillMatch: 90,
                availability: 120,
                experience: 80,
                collaborationHistory: 70
              },
              justification: 'Buen match'
            }
          ],
          complementarityAnalysis: 'Complementario',
          risks: ['Ninguno'],
          strengths: ['Node.js']
        }
      ]
    });

    assert.equal(result.proposals[0].teamScore, 100);
    assert.equal(result.proposals[0].members[0].affinityScore, 0);
    assert.equal(result.proposals[0].members[0].scoreBreakdown.availability, 100);
  });
});
