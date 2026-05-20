/**
 * Similitud semántica en grafo (SIMILAR_A): buscar React debe relacionar Vue.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

describe.skipIf(!hasNeo4jIntegration())('similitud semántica — Neo4j real', () => {
  const driver = createIntegrationDriver();

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }
  });

  afterAll(async () => {
    await driver.close();
  });

  it('encuentra Vue como habilidad similar a React via SIMILAR_A', async () => {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (react:Habilidad)
         WHERE toLower(react.name) = 'react' OR react.normalizedName = 'react'
         MATCH (react)-[sim:SIMILAR_A]->(related:Habilidad)
         WHERE toLower(related.name) = 'vue' OR related.normalizedName = 'vue'
         RETURN related.name AS skillName, sim.peso AS weight
         LIMIT 1`
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0]?.get('skillName')).toBe('Vue');
      expect(Number(result.records[0]?.get('weight'))).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  it('devuelve candidatos con Vue al filtrar por React via experiencia similar', async () => {
    const session = driver.session();
    const prefix = `sem-${Date.now()}`;
    const updatedAt = new Date().toISOString();

    try {
      await session.run(
        `MATCH (react:Habilidad) WHERE toLower(react.name) = 'react'
         MATCH (vue:Habilidad) WHERE toLower(vue.name) = 'vue'
         MERGE (u:Usuario {userId: $userId})
         ON CREATE SET u.user = 'Vue Dev', u.email = $email, u.createdAt = $updatedAt
         MERGE (u)-[e:TIENE_EXPERIENCIA_EN]->(vue)
         SET e.yearsOfExperience = 2.0, e.level = 'intermediate', e.updatedAt = $updatedAt`,
        { userId: `${prefix}-vue-dev`, email: `${prefix}@test.local`, updatedAt }
      );

      const search = await session.run(
        `MATCH (react:Habilidad) WHERE toLower(react.name) = 'react'
         MATCH (react)-[:SIMILAR_A]->(similar:Habilidad)
         MATCH (u:Usuario {userId: $userId})-[:TIENE_EXPERIENCIA_EN]->(similar)
         RETURN u.userId AS userId, similar.name AS matchedSkill`,
        { userId: `${prefix}-vue-dev` }
      );

      expect(search.records.length).toBeGreaterThan(0);
      const matched = search.records.map((r) => String(r.get('matchedSkill')).toLowerCase());
      expect(matched).toContain('vue');

      await session.run('MATCH (u:Usuario {userId: $userId}) DETACH DELETE u', { userId: `${prefix}-vue-dev` });
    } finally {
      await session.close();
    }
  });
});
