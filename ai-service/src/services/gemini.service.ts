import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getRequiredEnv } from '../config/env.js';
import type {
  NormalizedSkill,
  Profile,
  ProjectRequirement,
  TeamMatchProposal,
} from '../types/ai.types.js';

export type { Profile, ProjectRequirement } from '../types/ai.types.js';

let generativeModel: GenerativeModel | null = null;

/** Modelo activo (lee process.env en tiempo de ejecución, tras cargar .env) */
function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

/**
 * Inicializa el cliente de Gemini con la API key del entorno.
 * Debe llamarse al arrancar el servicio.
 */
export function initGeminiClient(): GenerativeModel {
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const modelName = getGeminiModel();
  const client = new GoogleGenerativeAI(apiKey);
  generativeModel = client.getGenerativeModel({ model: modelName });
  console.log(`[ai-service] Modelo Gemini: ${modelName}`);
  return generativeModel;
}

function getModel(): GenerativeModel {
  if (!generativeModel) {
    throw new Error(
      'El cliente de Gemini no está inicializado. Llama a initGeminiClient() al iniciar el servicio.',
    );
  }
  return generativeModel;
}

/** Extrae JSON de la respuesta de Gemini (soporta bloques ```json) */
function parseJsonResponse<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const codeBlockMatch = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const jsonString = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Gemini como JSON válido.');
  }
}

/**
 * Extrae y normaliza habilidades desde texto libre (CV, descripción, etc.).
 */
export async function processSkills(text: string): Promise<NormalizedSkill[]> {
  const model = getModel();

  const prompt = `Eres un asistente de TeamMatch. Analiza el siguiente texto y extrae las habilidades técnicas y blandas mencionadas.

Normaliza cada habilidad a un nombre estándar en español o inglés técnico (ej: "JS" → "JavaScript", "manejo de bases de datos" → "Bases de datos").
Asigna una categoría opcional: "tecnica", "blanda" u "otra".

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "skills": [
    { "original": "texto original", "normalized": "nombre normalizado", "category": "tecnica" }
  ]
}

Texto del usuario:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const parsed = parseJsonResponse<{ skills: NormalizedSkill[] }>(responseText);

  if (!Array.isArray(parsed.skills)) {
    throw new Error('La respuesta de Gemini no incluyó un arreglo de habilidades.');
  }

  return parsed.skills.map((skill) => ({
    original: skill.original ?? '',
    normalized: skill.normalized ?? skill.original ?? '',
    category: skill.category,
  }));
}

/**
 * Motor de matchmaking: propone equipos según perfiles y requisitos del proyecto.
 */
export async function matchTeams(
  profiles: Profile[],
  requirements: ProjectRequirement[],
): Promise<TeamMatchProposal[]> {
  const model = getModel();

  const prompt = `Eres el motor de matchmaking de TeamMatch. Dados los perfiles de candidatos y los requisitos del proyecto, genera hasta 5 propuestas de equipos.

Reglas:
- Cada propuesta debe incluir solo IDs de perfiles existentes (campo "id").
- "score" es un número entre 0 y 100 que indica la afinidad del equipo con los requisitos.
- "reasoning" explica brevemente en español por qué ese equipo encaja.
- Prioriza cubrir requisitos de prioridad "alta" y respeta el campo "count" cuando indique cuántas personas se necesitan con esa habilidad.

Responde ÚNICAMENTE con JSON válido:
{
  "proposals": [
    { "memberIds": ["id1", "id2"], "score": 85, "reasoning": "explicación" }
  ]
}

Perfiles:
${JSON.stringify(profiles, null, 2)}

Requisitos del proyecto:
${JSON.stringify(requirements, null, 2)}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const parsed = parseJsonResponse<{ proposals: TeamMatchProposal[] }>(responseText);

  if (!Array.isArray(parsed.proposals)) {
    throw new Error('La respuesta de Gemini no incluyó propuestas de equipos.');
  }

  const validIds = new Set(profiles.map((p) => p.id));

  return parsed.proposals
    .filter(
      (proposal) =>
        Array.isArray(proposal.memberIds) &&
        proposal.memberIds.every((id) => validIds.has(id)),
    )
    .map((proposal) => ({
      memberIds: proposal.memberIds,
      score: Math.min(100, Math.max(0, Number(proposal.score) || 0)),
      reasoning: proposal.reasoning ?? '',
    }));
}
