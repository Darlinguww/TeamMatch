/**
 * Remoción de miembro con tareas activas — Neo4j real (+ ruta HTTP).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { ConflictError } from '../../src/shared/errors/HttpErrors.js';
import { signAccessToken } from '../../src/shared/utils/jwt.js';
import { TeamDetailRepository } from '../../src/modules/teams/repositories/team-detail.repository.js';
import { TeamsService } from '../../src/modules/teams/teams.service.js';
import {
  attachActiveTaskToMember,
  cleanupUsersAndProjectsByPrefix,
  seedProjectMembersOnly
} from '../helpers/neo4j-fixtures.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `team-rm-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('remoción de miembro — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const service = new TeamsService(new TeamDetailRepository());
  let projectId: string;
  let memberId: string;
  let leaderId: string;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      const graph = await seedProjectMembersOnly(session, TEST_PREFIX);
      projectId = graph.projectId;
      memberId = graph.memberId;
      leaderId = graph.leaderId;
      await attachActiveTaskToMember(session, projectId, memberId, `${TEST_PREFIX}-active-task`);
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await cleanupUsersAndProjectsByPrefix(session, TEST_PREFIX);
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it('bloquea la remoción si el miembro tiene tareas activas', async () => {
    await expect(service.removeMember(leaderId, projectId, memberId)).rejects.toBeInstanceOf(ConflictError);
  });

  it('HTTP: DELETE /teams/:id/members/:memberId responde 409 con tareas activas', async () => {
    const token = signAccessToken({ sub: leaderId, email: `${leaderId}@test.local` });
    const res = await request(app)
      .delete(`/teams/${projectId}/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('permite remover al miembro cuando la tarea está completada', async () => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (t:Tarea {taskId: $taskId})
         SET t.status = 'done', t.estado = 'done'`,
        { taskId: `${TEST_PREFIX}-active-task` }
      );
    } finally {
      await session.close();
    }

    const result = await service.removeMember(leaderId, projectId, memberId);
    expect(result).toMatchObject({ teamId: projectId, memberId, removed: true });
  });
});
