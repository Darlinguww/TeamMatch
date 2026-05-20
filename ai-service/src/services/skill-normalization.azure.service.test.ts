import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockIsConfigured } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockIsConfigured: vi.fn(() => true),
}));

vi.mock('./llm/azure-openai.client.js', () => ({
  getAzureOpenAIClient: () => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }),
}));

vi.mock('../config/ai.config.js', () => ({
  aiConfig: {
    azureOpenAI: {
      endpoint: 'https://test.openai.azure.com',
      apiKey: 'test-key',
      deploymentName: 'gpt-4.1-mini',
      apiVersion: '2025-04-01-preview',
    },
  },
  isAzureOpenAIConfigured: () => mockIsConfigured(),
}));

import { processSkills } from './skill-normalization.azure.service.js';

describe('processSkills', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockCreate.mockReset();
    mockIsConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('usa Azure y marca source azure cuando la llamada tiene éxito', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              skills: [
                {
                  original: '5 años con React',
                  normalized: 'React',
                  category: 'technical',
                  yearsOfExperience: 5,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await processSkills('Desarrollador con React y Node.js');

    expect(result.source).toBe('azure');
    expect(result.skills).toEqual(
      expect.arrayContaining([expect.objectContaining({ normalized: 'React', yearsOfExperience: 5 })]),
    );
    expect(mockCreate).toHaveBeenCalled();
  });

  it('hace fallback heurístico cuando Azure lanza error', async () => {
    mockCreate.mockRejectedValue(new Error('Quota exceeded'));

    const result = await processSkills('Experiencia en Python, Docker y liderazgo de equipos');

    expect(result.source).toBe('heuristic');
    expect(result.skills.map((s) => s.normalized)).toEqual(
      expect.arrayContaining(['Python', 'Docker', 'Liderazgo']),
    );
  });

  it('hace fallback heurístico cuando Azure no está configurado', async () => {
    mockIsConfigured.mockReturnValue(false);

    const result = await processSkills('Conocimientos en TypeScript y Scrum');

    expect(result.source).toBe('heuristic');
    expect(result.skills.map((s) => s.normalized)).toEqual(
      expect.arrayContaining(['TypeScript', 'Scrum']),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('mantiene source azure aunque la IA no detecte habilidades', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ skills: [] }) } }],
    });

    const result = await processSkills('texto sin habilidades reconocibles por el modelo');

    expect(result.source).toBe('azure');
    expect(result.skills).toEqual([]);
  });
});
