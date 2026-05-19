import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runMatchmaking } from './matchmaking.service.js';
import type { CandidateProfile, ProjectRequirements, MatchmakingRequest } from './matchmaking.types.js';

const mockCreate = vi.fn();

vi.mock('../llm/azure-openai.client.js', () => ({
  getAzureOpenAIClient: () => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }),
}));

const project: ProjectRequirements = {
  projectId: 'proj-1',
  projectName: 'Demo',
  description: 'Proyecto de prueba',
  requiredRoles: [{ role: 'Backend', requiredSkills: ['Node.js'], priority: 'high' }],
  teamSize: 3,
};

const candidates: CandidateProfile[] = [
  {
    userId: 'u1',
    name: 'Ana',
    skills: [{ name: 'Node.js', level: 'avanzado', category: 'backend' }],
    experience: [],
    availability: { hoursPerWeek: 20, schedule: 'L-V' },
    feedbackHistory: [],
  },
];

describe('runMatchmaking', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna propuestas cuando Azure OpenAI responde correctamente', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              proposals: [
                {
                  proposalId: 'prop-1',
                  teamScore: 80,
                  members: [],
                  complementarityAnalysis: 'Equipo balanceado',
                  risks: [],
                  strengths: ['Node.js'],
                },
              ],
            }),
          },
        },
      ],
    });

    const request: MatchmakingRequest = {
      project,
      candidates,
      userInstructions: undefined,
    };

    const result = await runMatchmaking(request);

    expect(result.projectId).toBe('proj-1');
    expect(result.proposals).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledOnce();
    const callOptions = mockCreate.mock.calls[0][1];
    expect(callOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it('retorna proposals vacías cuando Azure OpenAI falla', async () => {
    mockCreate.mockRejectedValue(new Error('Error de red'));

    const request: MatchmakingRequest = {
      project,
      candidates,
      userInstructions: 'Priorizar perfiles senior con experiencia en cloud',
    };

    const result = await runMatchmaking(request);

    expect(result).toMatchObject({
      projectId: 'proj-1',
      proposals: [],
    });
    expect(result.generatedAt).toBeTruthy();
  });
});
