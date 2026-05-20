import neo4j from 'neo4j-driver';
import { env } from '../../src/config/env.js';

/** Habilita suites que requieren Neo4j real (Docker). */
export function hasNeo4jIntegration(): boolean {
  return process.env.RUN_E2E_NEO4J === 'true';
}

/** URI Bolt para tests ejecutados en el host (fuera del contenedor backend). */
export function getNeo4jTestUri(): string {
  return process.env.NEO4J_TEST_URI?.trim() || 'bolt://localhost:7687';
}

export function createIntegrationDriver() {
  const uri = hasNeo4jIntegration() ? getNeo4jTestUri() : env.neo4j.uri;
  return neo4j.driver(
    uri,
    neo4j.auth.basic(env.neo4j.user, env.neo4j.password),
    { disableLosslessIntegers: true }
  );
}

export async function verifyNeo4jConnection(): Promise<boolean> {
  const driver = createIntegrationDriver();
  const session = driver.session();
  try {
    await session.run('RETURN 1 AS ok');
    return true;
  } catch {
    return false;
  } finally {
    await session.close();
    await driver.close();
  }
}
