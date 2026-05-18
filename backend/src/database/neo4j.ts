import neo4j from 'neo4j-driver';
import { env } from '../config/env.js';

export const driver = neo4j.driver(
  env.neo4j.uri,
  neo4j.auth.basic(env.neo4j.user, env.neo4j.password),
  { disableLosslessIntegers: true }
);
