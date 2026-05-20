import neo4j, { type Driver } from 'neo4j-driver';
import { env } from './env.js';

/** Driver Bolt compatible con Neo4j 5.x (neo4j-driver 5.28.x). */
export const driver: Driver = neo4j.driver(
  env.neo4j.uri,
  neo4j.auth.basic(env.neo4j.user, env.neo4j.password),
  { disableLosslessIntegers: true }
);

/**
 * Comprueba conectividad al arrancar. Falla con mensaje claro si Neo4j no responde.
 */
export async function verifyConnectivity(): Promise<void> {
  try {
    await driver.verifyConnectivity();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `Neo4j no disponible en ${env.neo4j.uri} (usuario: ${env.neo4j.user}). ${detail}. ` +
        'Verifica que el contenedor neo4j esté healthy y las variables NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD.'
    );
  }
}
