/**
 * Regresión: feedback EVALUO actualiza reputación en el motor de matchmaking.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FeedbackService } from '../../src/modules/feedback/feedback.service.js';
import { MatchmakingService } from '../../src/modules/matchmaking/matchmaking.service.js';
import { MatchmakingRepository } from '../../src/modules/matchmaking/matchmaking.repository.js';
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

const TEST_PREFIX = `mm-rep-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('reputación tras feedback — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const matchmaking = new MatchmakingService(new MatchmakingRepository());
  const feedback = new FeedbackService(new Neo4jProjectRepository());
  let projectId: string;
  let leaderId: string;
  let memberId: string;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    const now = new Date().toISOString();
    try {
      const graph = await seedProjectMembersOnly(session, TEST_PREFIX);
      projectId = graph.projectId;
      leaderId = graph.leaderId;
      memberId = graph.memberId;

      await session.run(
        `MERGE (skill:Habilidad {normalizedName: 'react'})
         ON CREATE SET skill.name = 'React', skill.createdAt = $now
         MERGE (role:Rol {roleId: $roleId})
         ON CREATE SET role.name = 'Frontend Dev', role.createdAt = $now
         MATCH (project:Proyecto {projectId: $projectId})
         MATCH (member:Usuario {userId: $memberId})
         MERGE (project)-[:TIENE_ROL]->(role)
         MERGE (role)-[:REQUIERE]->(skill)
         MERGE (member)-[:TIENE_EXPERIENCIA_EN]->(skill)
         SET member.updatedAt = $now`,
        { projectId, memberId, roleId: `${TEST_PREFIX}-role`, now }
      );
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await cleanupUsersAndProjectsByPrefix(session, TEST_PREFIX);
      await session.run(
        `MATCH (r:Rol) WHERE r.roleId STARTS WITH $prefix DETACH DELETE r`,
        { prefix: TEST_PREFIX }
      );
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it('incrementa reputationScore tras registrar feedback', async () => {
    const before = await matchmaking.scoreProjectCandidates(projectId, { includeProjectMembers: true });
    const memberBefore = before.matches.find((m) => m.userId === memberId);
    expect(memberBefore).toBeDefined();
    expect(memberBefore!.reputationScore).toBe(0);

    await feedback.closeProjectAndEnableFeedback(leaderId, projectId, 7);
    await feedback.submitFeedback(leaderId, {
      projectId,
      toUserId: memberId,
      score: 5
    });

    const after = await matchmaking.scoreProjectCandidates(projectId, { includeProjectMembers: true });
    const memberAfter = after.matches.find((m) => m.userId === memberId);
    expect(memberAfter).toBeDefined();
    expect(memberAfter!.reputationScore).toBeCloseTo(1, 5);
    expect(memberAfter!.breakdown.reputation).toBeGreaterThan(memberBefore!.breakdown.reputation);
    expect(memberAfter!.score).toBeGreaterThan(memberBefore!.score);
  });
});
