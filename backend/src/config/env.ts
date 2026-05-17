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

const nodeEnv = readStringEnv('NODE_ENV', 'development');
const isProductionNodeEnv = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET?.trim();

if (isProductionNodeEnv && !jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

export const env = {
  nodeEnv,
  port: readNumberEnv('PORT', 3000),
  jwtSecret: jwtSecret || 'dev-secret',
  jwtExpiresIn: readStringEnv('JWT_EXPIRES_IN', '24h'),
  maxLoginAttempts: readNumberEnv('MAX_LOGIN_ATTEMPTS', 4),
  loginBlockDurationMs: readNumberEnv('LOGIN_BLOCK_DURATION_MS', 900000),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: readStringEnv('GEMINI_MODEL', 'gemini-1.5-flash'),
  neo4j: {
    uri: readStringEnv('NEO4J_URI', 'bolt://neo4j:7687'),
    user: readStringEnv('NEO4J_USER', 'neo4j'),
    password: readStringEnv('NEO4J_PASSWORD', 'neo4j')
  }
} as const;

export const isProduction = isProductionNodeEnv;
