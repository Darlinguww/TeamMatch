import dotenv from 'dotenv';
import { assertAllowedAiServiceUrl } from '../shared/security/ai-service-url.js';

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
const gdsRebuildSecret = process.env.GDS_REBUILD_SECRET?.trim() || '';
const aiServiceUrl = process.env.AI_SERVICE_URL?.trim() || '';
const internalAiServiceToken = process.env.INTERNAL_AI_SERVICE_TOKEN?.trim() || '';

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

if (isProductionNodeEnv && !gdsRebuildSecret) {
  throw new Error('GDS_REBUILD_SECRET is required in production');
}

if (isProductionNodeEnv && aiServiceUrl && !internalAiServiceToken) {
  throw new Error('INTERNAL_AI_SERVICE_TOKEN is required in production when AI_SERVICE_URL is set');
}

assertAllowedAiServiceUrl(aiServiceUrl);

export const env = {
  nodeEnv,
  port: readNumberEnv('PORT', 3000),
  jwtSecret: jwtSecret || 'dev-secret',
  jwtExpiresIn: readStringEnv('JWT_EXPIRES_IN', '24h'),
  maxLoginAttempts: readNumberEnv('MAX_LOGIN_ATTEMPTS', 4),
  loginBlockDurationMs: readNumberEnv('LOGIN_BLOCK_DURATION_MS', 900000),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: readStringEnv('GEMINI_MODEL', 'gemini-1.5-flash'),
  gdsRebuildSecret,
  processingTimeoutMs: readNumberEnv('PROCESSING_TIMEOUT_MS', 30000),
  aiServiceUrl,
  internalAiServiceToken,
  skillsAdminEmails: readStringListEnv('SKILLS_ADMIN_EMAILS'),
  maxSuggestSkillsTextLength: readNumberEnv('MAX_SUGGEST_SKILLS_TEXT_LENGTH', 20000),
  maxPdfPages: readNumberEnv('MAX_PDF_PAGES', 30),
  corsOrigins,
  neo4j: {
    uri: readStringEnv('NEO4J_URI', 'bolt://neo4j:7687'),
    user: readStringEnv('NEO4J_USER', 'neo4j'),
    password: neo4jPassword
  }
} as const;

export const isProduction = isProductionNodeEnv;
