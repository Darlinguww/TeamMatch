import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
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

describe('security routes (integration)', () => {
  it('bloquea /match/:id/score sin JWT', async () => {
    const response = await request(app)
      .get('/match/user-1/score')
      .expect(401);

    expect(response.body.error).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rechaza token malformado en rutas protegidas', async () => {
    const response = await request(app)
      .get('/api/protected-route')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);

    expect(['UNAUTHORIZED', 'INVALID_TOKEN']).toContain(response.body.error.code);
  });

  it('limita el endpoint de match score a usuarios autenticados', async () => {
    const token = jwt.sign(
      { sub: 'user-test', email: 'test@example.com' },
      env.jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/match/non-existent-user/score')
      .set('Authorization', `Bearer ${token}`);

    expect([404, 500]).toContain(response.status);
  });
});

const SECURITY_PREFIX = `sec-idor-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('IDOR workflow tareas — Neo4j real', () => {
  const driver = createIntegrationDriver();
  let graph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      graph = await seedProjectTaskGraph(session, SECURITY_PREFIX);
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await cleanupUsersAndProjectsByPrefix(session, SECURITY_PREFIX);
    } finally {
      await session.close();
      await driver.close();
    }
  });

  /** Ruta real montada en `app.ts` como `app.use('/tasks', tasksRoutes)` → POST `/tasks/:id/review`. */
  it('un miembro no puede aprobar tarea vía POST /tasks/:id/review', async () => {
    const memberToken = signAccessToken({ sub: graph.memberId, email: `${graph.memberId}@test.local` });

    const response = await request(app)
      .post(`/tasks/${graph.taskId}/review`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ decision: 'approved' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('un usuario removido del proyecto no puede avanzar una tarea aunque siga asignado', async () => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (:Usuario {userId: $memberId})-[membership:PERTENECE_A]->(:Proyecto {projectId: $projectId})
         DELETE membership`,
        { memberId: graph.memberId, projectId: graph.projectId }
      );
    } finally {
      await session.close();
    }

    const memberToken = signAccessToken({ sub: graph.memberId, email: `${graph.memberId}@test.local` });

    const response = await request(app)
      .patch(`/tasks/${graph.taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'en revision' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
