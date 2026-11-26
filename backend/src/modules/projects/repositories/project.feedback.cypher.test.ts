import { beforeEach, describe, expect, it, vi } from 'vitest';

const run = vi.fn(async () => ({ records: [] }));
const close = vi.fn(async () => undefined);

vi.mock('../../../database/neo4j.js', () => ({
  driver: {
    session: () => ({ run, close })
  }
}));

import { Neo4jProjectRepository } from './project.repository.js';

describe('createFeedbackRelationship', () => {
  beforeEach(() => {
    run.mockClear();
    close.mockClear();
  });

  it('scopes EVALUO to the project so a later review does not overwrite an earlier score', async () => {
    const repository = new Neo4jProjectRepository();

    await repository.createFeedbackRelationship(
      'project-b',
      'alice',
      'bob',
      1,
      'later project',
      '2026-11-26T00:00:00.000Z'
    );

    const query = String(run.mock.calls[0]?.[0]);
    const params = run.mock.calls[0]?.[1] as { projectId?: string; score?: number };

    expect(query).toContain('MERGE (from)-[f:EVALUO {proyectoId: $projectId}]->(to)');
    expect(query).not.toContain('MERGE (from)-[f:EVALUO]->(to)');
    expect(params).toMatchObject({ projectId: 'project-b', fromUserId: 'alice', toUserId: 'bob', score: 1 });
    expect(close).toHaveBeenCalledOnce();
  });
});
