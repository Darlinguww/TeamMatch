/**
 * Unicidad EVALUO por (evaluadorId, evaluadoId, proyectoId) en el grafo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupUsersAndProjectsByPrefix,
  seedProjectMembersOnly
} from '../helpers/neo4j-fixtures.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `eval-unique-${Date.now()}`;
const CONSTRAINT_NAME = 'evaluacion_unica_qa_idx';

describe.skipIf(!hasNeo4jIntegration())('unicidad EVALUO — Neo4j real', () => {
  const driver = createIntegrationDriver();
  let projectId: string;
  let leaderId: string;
  let memberId: string;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      await session.run(
        `CREATE CONSTRAINT ${CONSTRAINT_NAME} IF NOT EXISTS
         FOR ()-[r:EVALUO]-()
         REQUIRE (r.evaluadorId, r.evaluadoId, r.proyectoId) IS UNIQUE`
      );

      const graph = await seedProjectMembersOnly(session, TEST_PREFIX);
      projectId = graph.projectId;
      leaderId = graph.leaderId;
      memberId = graph.memberId;
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await cleanupUsersAndProjectsByPrefix(session, TEST_PREFIX);
      await session.run(`DROP CONSTRAINT ${CONSTRAINT_NAME} IF EXISTS`);
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it('impide duplicar la misma evaluación en el grafo', async () => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (from:Usuario {userId: $fromUserId}), (to:Usuario {userId: $toUserId})
         MERGE (from)-[e:EVALUO]->(to)
         ON CREATE SET e.proyectoId = $projectId,
                       e.evaluadorId = $fromUserId,
                       e.evaluadoId = $toUserId,
                       e.puntaje = 4.0`,
        { fromUserId: leaderId, toUserId: memberId, projectId }
      );

      await expect(session.run(
        `MATCH (from:Usuario {userId: $fromUserId}), (to:Usuario {userId: $toUserId})
         CREATE (from)-[e:EVALUO]->(to)
         SET e.proyectoId = $projectId,
             e.evaluadorId = $fromUserId,
             e.evaluadoId = $toUserId,
             e.puntaje = 5.0`,
        { fromUserId: leaderId, toUserId: memberId, projectId }
      )).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});
