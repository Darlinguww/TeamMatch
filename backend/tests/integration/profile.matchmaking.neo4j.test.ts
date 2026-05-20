/**
 * Matchmaking de perfiles contra Neo4j real (Docker).
 * Requiere: docker compose up -d neo4j && RUN_E2E_NEO4J=true
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProfileRepository } from '../../src/modules/profile/repositories/profile.repository.js';
import { ProfileService } from '../../src/modules/profile/profile.service.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `mm-test-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('pipeline de matchmaking — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const repository = new ProfileRepository();
  const service = new ProfileService(repository);

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    const updatedAt = new Date().toISOString();
    try {
      await session.run(
        `MERGE (react:Habilidad {normalizedName: 'react'})
         ON CREATE SET react.name = 'React', react.createdAt = $updatedAt
         MERGE (node:Habilidad {normalizedName: 'node'})
         ON CREATE SET node.name = 'Node', node.createdAt = $updatedAt
         MERGE (senior:Usuario {userId: $seniorId})
         ON CREATE SET senior.user = 'Senior React', senior.email = $seniorEmail, senior.createdAt = $updatedAt
         MERGE (junior:Usuario {userId: $juniorId})
         ON CREATE SET junior.user = 'Junior React', junior.email = $juniorEmail, junior.createdAt = $updatedAt
         MERGE (senior)-[se1:TIENE_EXPERIENCIA_EN]->(react)
         SET se1.yearsOfExperience = 5.0, se1.level = 'expert', se1.updatedAt = $updatedAt
         MERGE (senior)-[se2:TIENE_EXPERIENCIA_EN]->(node)
         SET se2.yearsOfExperience = 3.0, se2.level = 'advanced', se2.updatedAt = $updatedAt
         MERGE (junior)-[je:TIENE_EXPERIENCIA_EN]->(react)
         SET je.yearsOfExperience = 1.0, je.level = 'beginner', je.updatedAt = $updatedAt
         MERGE (senior)-[:TIENE_HABILIDAD]->(react)
         MERGE (senior)-[:TIENE_HABILIDAD]->(node)
         MERGE (junior)-[:TIENE_HABILIDAD]->(react)
         MERGE (avail1:Disponibilidad {day: 'monday', start: '09:00', end: '12:00'})
         MERGE (avail2:Disponibilidad {day: 'monday', start: '09:00', end: '12:00'})
         MERGE (senior)-[:DISPONIBLE_EN]->(avail1)
         MERGE (junior)-[:DISPONIBLE_EN]->(avail2)`,
        {
          updatedAt,
          seniorId: `${TEST_PREFIX}-senior`,
          juniorId: `${TEST_PREFIX}-junior`,
          seniorEmail: `${TEST_PREFIX}-senior@test.local`,
          juniorEmail: `${TEST_PREFIX}-junior@test.local`
        }
      );
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (u:Usuario)
         WHERE u.userId STARTS WITH $prefix
         DETACH DELETE u`,
        { prefix: TEST_PREFIX }
      );
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it('ordena resultados por score con distintos perfiles', async () => {
    const results = await service.searchUsers({
      skills: ['react'],
      minYears: null,
      availability: null,
      limit: 50,
      offset: 0
    });

    const ids = results
      .filter((r) => r.userId.startsWith(TEST_PREFIX))
      .map((r) => r.userId);

    expect(ids).toEqual([`${TEST_PREFIX}-senior`, `${TEST_PREFIX}-junior`]);
  });

  it('mantiene el score consistente con matchingSkills, experiencia y disponibilidad', async () => {
    const results = await service.searchUsers({
      skills: ['react', 'node'],
      minYears: null,
      availability: { day: 'monday', start: '09:30', end: '11:00' },
      limit: 50,
      offset: 0
    });

    const best = results.find((r) => r.userId === `${TEST_PREFIX}-senior`);
    expect(best).toBeDefined();
    expect(best!.match.matchingSkills).toBe(2);
    expect(best!.match.totalMatchingYears).toBe(8);
    expect(best!.match.availabilityMatched).toBe(true);
    const baseScore =
      (best!.match.matchingSkills * 100) +
      (best!.match.totalMatchingYears * 10) +
      50 +
      best!.match.categoryWeightApplied;
    expect(best!.match.score).toBeCloseTo(baseScore + best!.match.reputationWeightApplied, 5);
  });

  it('no infla resultados con habilidades redundantes en el filtro', async () => {
    const results = await service.searchUsers({
      skills: ['react', 'react', 'node'],
      minYears: null,
      availability: null,
      limit: 50,
      offset: 0
    });

    const seniorOnly = results.filter((r) => r.userId.startsWith(TEST_PREFIX));
    expect(seniorOnly.map((r) => r.userId)).toEqual([`${TEST_PREFIX}-senior`]);
  });

  it('respeta la compatibilidad de disponibilidad solicitada', async () => {
    const results = await service.searchUsers({
      skills: ['react'],
      minYears: null,
      availability: { day: 'monday', start: '09:30', end: '11:00' },
      limit: 50,
      offset: 0
    });

    const filtered = results.filter((r) => r.userId.startsWith(TEST_PREFIX));
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every((r) => r.match.availabilityMatched)).toBe(true);
  });

  it('resuelve 100 perfiles por debajo de 20 segundos', async () => {
    const startedAt = performance.now();
    const results = await service.searchUsers({
      skills: ['react'],
      minYears: null,
      availability: { day: 'monday', start: '10:00', end: '11:00' },
      limit: 100,
      offset: 0
    });
    const elapsedMs = performance.now() - startedAt;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(20_000);
  });
});
