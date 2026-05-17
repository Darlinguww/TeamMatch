import dotenv from 'dotenv';

dotenv.config();

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function readStringEnv(name: string, fallback: string): string {
  const rawValue = process.env[name];
  return rawValue && rawValue.trim() ? rawValue.trim() : fallback;
}

export const env = {
  nodeEnv: readStringEnv('NODE_ENV', 'development'),
  port: readNumberEnv('PORT', 3000),
  jwtSecret: readStringEnv('JWT_SECRET', 'dev-secret'),
  jwtExpiresIn: readStringEnv('JWT_EXPIRES_IN', '24h'),
  maxLoginAttempts: readNumberEnv('MAX_LOGIN_ATTEMPTS', 4),
  loginBlockDurationMs: readNumberEnv('LOGIN_BLOCK_DURATION_MS', 900000),
  neo4j: {
    uri: readStringEnv('NEO4J_URI', 'bolt://neo4j:7687'),
    user: readStringEnv('NEO4J_USER', 'neo4j'),
    password: readStringEnv('NEO4J_PASSWORD', 'neo4j')
  }
} as const;

export const isProduction = env.nodeEnv === 'production';
