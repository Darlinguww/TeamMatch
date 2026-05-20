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

function readStringListEnv(name: string): string[] {
  const rawValue = process.env[name];
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isPlaceholderSecret(value: string): boolean {
  return value.startsWith('<CAMBIAR_') || value.includes('pega_aqui');
}

const nodeEnv = readStringEnv('NODE_ENV', 'development');
const isProductionNodeEnv = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET?.trim();
const neo4jPassword = readStringEnv('NEO4J_PASSWORD', 'neo4j');
const corsOrigins = readStringListEnv('CORS_ORIGIN');

if (isProductionNodeEnv && !jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

if (isProductionNodeEnv && jwtSecret && (jwtSecret.length < 32 || isPlaceholderSecret(jwtSecret))) {
  throw new Error('JWT_SECRET must be a strong non-placeholder value in production');
}

if (isProductionNodeEnv && (neo4jPassword === 'neo4j' || isPlaceholderSecret(neo4jPassword))) {
  throw new Error('NEO4J_PASSWORD must be a strong non-placeholder value in production');
}

if (isProductionNodeEnv && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN is required in production');
}

export const env = {
  nodeEnv,
  port: readNumberEnv('PORT', 3000),
  jwtSecret: jwtSecret || 'dev-secret',
  jwtExpiresIn: readStringEnv('JWT_EXPIRES_IN', '24h'),
  maxLoginAttempts: readNumberEnv('MAX_LOGIN_ATTEMPTS', 4),
  loginBlockDurationMs: readNumberEnv('LOGIN_BLOCK_DURATION_MS', 900000),
  aiServiceUrl: readStringEnv('AI_SERVICE_URL', 'http://localhost:3001'),
  gdsRebuildSecret: process.env.GDS_REBUILD_SECRET?.trim() || '',
  processingTimeoutMs: readNumberEnv('PROCESSING_TIMEOUT_MS', 30000),
  corsOrigins,
  authRegisterEmailWhitelist: readStringListEnv('AUTH_REGISTER_EMAIL_WHITELIST'),
  neo4j: {
    uri: readStringEnv('NEO4J_URI', 'bolt://neo4j:7687'),
    user: readStringEnv('NEO4J_USER', 'neo4j'),
    password: neo4jPassword
  }
} as const;

export const isProduction = isProductionNodeEnv;
