import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../shared/errors/HttpErrors.js';

const { queries, run, close } = vi.hoisted(() => {
  const queries: string[] = [];
  const run = vi.fn(async (query: string) => {
    queries.push(query);
    if (query.includes('project.summary')) {
      return { records: [{ get: () => 'project-1' }] };
    }

    return { records: [] };
  });
  const close = vi.fn(async () => undefined);
  return { queries, run, close };
});

vi.mock('../../database/neo4j.js', () => ({
  driver: {
    session: () => ({ run, close })
  }
}));

import { Neo4jProjectRepository } from './repositories/project.repository.js';

describe('Neo4jProjectRepository destructive rewrites', () => {
  const repository = new Neo4jProjectRepository();

  beforeEach(() => {
    queries.length = 0;
    run.mockClear();
    close.mockClear();
  });

  it('replaces project roles once after deleting every previous role', async () => {
    await expect(repository.updateProject('leader-1', 'project-1', {
      title: 'Portal',
      description: 'Updated',
      roles: [
        { role: 'Frontend', skills: ['React'], headcount: 1 },
        { role: 'Backend', skills: ['Node.js'], headcount: 1 }
      ]
    })).rejects.toBeInstanceOf(NotFoundError);

    const roleQuery = queries.find((query) => query.includes('DETACH DELETE oldRole'));
    expect(roleQuery).toBeDefined();
    expect(roleQuery).toContain('WITH DISTINCT project');
    expect(roleQuery).toContain('UNWIND $roles AS roleInput');
    expect(roleQuery).not.toMatch(/WITH project\s+UNWIND \$roles/);
  });

  it('stores each peer evaluation on its own project relationship', async () => {
    await repository.createFeedbackRelationship(
      'project-2',
      'user-a',
      'user-b',
      4,
      'sólido',
      '2026-10-29T00:00:00.000Z'
    );

    const feedbackQuery = queries.find((query) => query.includes('EVALUO'));
    expect(feedbackQuery).toContain('MERGE (from)-[f:EVALUO {proyectoId: $projectId}]->(to)');
    expect(feedbackQuery).not.toContain('MERGE (from)-[f:EVALUO]->(to)');
  });
});
