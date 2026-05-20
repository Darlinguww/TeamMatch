/**
 * Ciclo de vida de tarea contra Neo4j real (workflow repository + rutas HTTP).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { ForbiddenError } from '../../src/shared/errors/HttpErrors.js';
import { TaskWorkflowRepository } from '../../src/modules/tasks/repositories/task-workflow.repository.js';
import { TasksService } from '../../src/modules/tasks/tasks.service.js';
import { signAccessToken } from '../../src/shared/utils/jwt.js';
import {
  cleanupUsersAndProjectsByPrefix,
  seedProjectTaskGraph
} from '../helpers/neo4j-fixtures.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `task-wf-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('ciclo de vida de tarea — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const repository = new TaskWorkflowRepository();
  const service = new TasksService(repository);
  let graph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;
  let httpGraph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;
  let rejectGraph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      graph = await seedProjectTaskGraph(session, TEST_PREFIX);
      httpGraph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-http`);
      rejectGraph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-rej`);
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

  it('permite al miembro enviar la tarea a revisión y notifica al líder', async () => {
    const result = await service.updateStatus(graph.taskId, graph.memberId, { status: 'In Review' });

    expect(result.task.status).toBe('In Review');
    expect(result.notification).toMatchObject({
      type: 'TASK_IN_REVIEW',
      recipientUserId: graph.leaderId
    });
  });

  it('impide que un miembro apruebe la tarea (solo líder)', async () => {
    await expect(service.reviewTask(graph.taskId, graph.memberId, {
      decision: 'approved',
      comment: null
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('permite al líder aprobar la tarea tras la revisión', async () => {
    const result = await service.reviewTask(graph.taskId, graph.leaderId, {
      decision: 'approved',
      comment: 'LGTM'
    });

    expect(result.task.status).toBe('Approved');
    expect(result.review).toMatchObject({
      decision: 'approved',
      reviewedBy: graph.leaderId
    });
  });

  it('flujo completo vía HTTP: PATCH /tasks/:id/status y POST /tasks/:id/review', async () => {
    const memberToken = signAccessToken({ sub: httpGraph.memberId, email: `${httpGraph.memberId}@test.local` });
    const leaderToken = signAccessToken({ sub: httpGraph.leaderId, email: `${httpGraph.leaderId}@test.local` });

    const patchRes = await request(app)
      .patch(`/tasks/${httpGraph.taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'In Review' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.task.status).toBe('In Review');

    const reviewRes = await request(app)
      .post(`/tasks/${httpGraph.taskId}/review`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ decision: 'approved', comment: 'vía API' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.task.status).toBe('Approved');
  });

  it('el líder puede rechazar la tarea en revisión', async () => {
    await service.updateStatus(rejectGraph.taskId, rejectGraph.memberId, { status: 'In Review' });

    const result = await service.reviewTask(rejectGraph.taskId, rejectGraph.leaderId, {
      decision: 'rejected',
      comment: 'Necesita cambios'
    });

    expect(result.task.status).toBe('Rejected');
    expect(result.review).toMatchObject({
      decision: 'rejected',
      reviewedBy: rejectGraph.leaderId
    });
  });
});
