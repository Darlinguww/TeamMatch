import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRun, mockSession } = vi.hoisted(() => {
  const mockRun = vi.fn();
  const mockSession = vi.fn(() => ({
    run: mockRun,
    close: vi.fn().mockResolvedValue(undefined),
  }));
  return { mockRun, mockSession };
});

vi.mock('../../../database/neo4j.js', () => ({
  driver: { session: mockSession },
}));

import { Neo4jTeamRepository } from './team.repository.js';

describe('Neo4jTeamRepository.assignMemberFromMatchmaking', () => {
  const repository = new Neo4jTeamRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna asignación con fecha cuando usuario y proyecto existen', async () => {
    mockRun.mockResolvedValue({
      records: [
        {
          get: (key: string) =>
            ({
              userId: 'user-1',
              projectId: 'project-1',
              rol: 'backend',
              fechaAsignacion: '2026-05-19T12:00:00Z',
            })[key],
        },
      ],
    });

    const result = await repository.assignMemberFromMatchmaking('user-1', 'project-1', 'backend');

    expect(result).toEqual({
      userId: 'user-1',
      projectId: 'project-1',
      rol: 'backend',
      fechaAsignacion: '2026-05-19T12:00:00Z',
    });
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (user)-[membership:PERTENECE_A]->(project)'),
      { userId: 'user-1', projectId: 'project-1', rol: 'backend' },
    );
  });

  it('retorna null si no hay filas (usuario o proyecto inexistente)', async () => {
    mockRun.mockResolvedValue({ records: [] });

    const result = await repository.assignMemberFromMatchmaking('missing', 'project-1', 'qa');

    expect(result).toBeNull();
  });
});
