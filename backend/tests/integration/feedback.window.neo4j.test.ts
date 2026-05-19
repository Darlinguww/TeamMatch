/**
 * Retroalimentación solo tras cerrar el proyecto y ventana activa.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BadRequestError } from '../../src/shared/errors/HttpErrors.js';
import { FeedbackService } from '../../src/modules/feedback/feedback.service.js';
import { Neo4jProjectRepository } from '../../src/modules/projects/repositories/project.repository.js';
import {
  cleanupUsersAndProjectsByPrefix,
  seedProjectMembersOnly
} from '../helpers/neo4j-fixtures.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `fb-win-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('ventana de feedback — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const projectRepo = new Neo4jProjectRepository();
  const service = new FeedbackService(projectRepo);
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
      const graph = await seedProjectMembersOnly(session, TEST_PREFIX);
      projectId = graph.projectId;
      leaderId = graph.leaderId;
      memberId = graph.memberId;

      await session.run(
        `MATCH (p:Proyecto {projectId: $projectId})
         SET p.status = 'ACTIVE',
             p.feedbackEnabled = false`,
        { projectId }
      );
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

  it('rechaza feedback antes de cerrar el proyecto', async () => {
    await expect(service.submitFeedback(leaderId, {
      projectId,
      toUserId: memberId,
      score: 4
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rechaza feedback si el proyecto sigue ACTIVE aunque feedbackEnabled esté en true', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session = driver.session();
    try {
      await session.run(
        `MATCH (p:Proyecto {projectId: $projectId})
         SET p.status = 'ACTIVE',
             p.feedbackEnabled = true,
             p.feedbackStart = $start,
             p.feedbackEnd = $end`,
        { projectId, start, end }
      );
    } finally {
      await session.close();
    }

    await expect(service.submitFeedback(leaderId, {
      projectId,
      toUserId: memberId,
      score: 4
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('acepta feedback tras cerrar y habilitar la ventana', async () => {
    await service.closeProjectAndEnableFeedback(leaderId, projectId, 7);

    const first = await service.submitFeedback(leaderId, {
      projectId,
      toUserId: memberId,
      score: 5,
      comment: 'Excelente colaboración'
    });

    expect(first.score).toBe(5);

    await expect(service.submitFeedback(leaderId, {
      projectId,
      toUserId: memberId,
      score: 3
    })).rejects.toThrow(/already submitted/i);
  });
});
