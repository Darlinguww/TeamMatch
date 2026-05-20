import { aiConfig, isAzureOpenAIConfigured } from '../config/ai.config.js';
import { getAzureTimeoutMs } from '../config/processing.config.js';
import { getAzureOpenAIClient } from './llm/azure-openai.client.js';
import { executeWithAzureOpenAIFallback } from './llm/azure-openai.executor.js';
import { extractSkillsHeuristic } from './skill-extraction/skill-heuristic.js';
import type {
  NormalizedSkill,
  Profile,
  ProjectRequirement,
  TeamMatchProposal,
} from '../types/ai.types.js';

export type SkillExtractionSource = 'azure' | 'heuristic';

export interface ProcessSkillsResult {
  skills: NormalizedSkill[];
  source: SkillExtractionSource;
}

export type { Profile, ProjectRequirement } from '../types/ai.types.js';

const PROCESS_SKILLS_SYSTEM_PROMPT = `Eres un asistente experto de TeamMatch. INTERPRETA texto libre (CV, bio, notas, descripción de perfil) en español o inglés y extrae TODAS las habilidades, competencias, áreas e intereses que el texto sugiera — no solo tecnologías.

Debes detectar explícita O implícitamente, por ejemplo:
- "trabajo bien en equipo" / "work well in teams" → Trabajo en equipo (soft)
- "me gusta liderar proyectos" → Liderazgo (soft)
- "enfocado en UI/UX" → UX/UI (technical)
- "ayudo a organizar tareas" → Organización (soft)
- "buena comunicación" → Comunicación (soft)
- "resolución de problemas" → Resolución de problemas (soft)
- "creativo", "proactivo", "empatía", "mentoría", "presentaciones"
- áreas: marketing, finanzas, RRHH, educación, salud, producto, datos, IA
- herramientas y lenguajes: Python, React, Figma, Excel, etc.
- metodologías: Scrum, Kanban, ágiles
- idiomas si aparecen

Categorías (category):
- technical: herramientas, lenguajes, diseño técnico, UX/UI, QA, cloud, etc.
- soft: colaboración, liderazgo, comunicación, organización, creatividad, autonomía, gestión del tiempo, orientación al cliente
- domain: sector o área profesional (finanzas, logística, producto, intereses profesionales)
- language: idiomas

Incluye yearsOfExperience si el texto menciona años. confidence entre 0 y 1.
NO omitas competencias blandas por ser "no técnicas". NO devuelvas solo lenguajes de programación si el texto también describe habilidades humanas.

Responde ÚNICAMENTE JSON válido (sin markdown):
{
  "skills": [
    {
      "original": "fragmento del texto",
      "normalized": "nombre canónico",
      "category": "technical|soft|domain|language",
      "confidence": 0.0,
      "yearsOfExperience": 0
    }
  ]
}
Si no hay nada interpretable: { "skills": [] }.`;

function parseJsonResponse<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const codeBlockMatch = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const jsonString = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Azure OpenAI como JSON válido.');
  }
}

function clampConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

function clampYears(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return undefined;
  return Math.min(80, Math.round(value));
}

function normalizeSkillsFromAzurePayload(skills: NormalizedSkill[]): NormalizedSkill[] {
  return skills
    .map((skill): NormalizedSkill | null => {
      const normalized = String(skill.normalized ?? skill.original ?? '').trim();
      const original = String(skill.original ?? normalized).trim();
      if (!normalized) return null;
      return {
        original: original || normalized,
        normalized,
        category: skill.category,
        confidence: clampConfidence(skill.confidence),
        yearsOfExperience: clampYears(skill.yearsOfExperience),
      };
    })
    .filter((s): s is NormalizedSkill => s !== null);
}

async function extractSkillsWithAzure(text: string): Promise<NormalizedSkill[]> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  const response = await client.chat.completions.create(
    {
      model: deploymentName,
      messages: [
        { role: 'system', content: PROCESS_SKILLS_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    },
    { signal: AbortSignal.timeout(getAzureTimeoutMs()) },
  );

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Azure OpenAI no retornó contenido');
  }

  const parsed = parseJsonResponse<{ skills: NormalizedSkill[] }>(rawContent);
  if (!Array.isArray(parsed.skills)) {
    throw new Error('La respuesta no incluyó un arreglo de habilidades.');
  }

  return normalizeSkillsFromAzurePayload(parsed.skills);
}

function heuristicFallback(text: string, reason: string): ProcessSkillsResult {
  console.warn(`[process-skills] ${reason}; usando extracción heurística local.`);
  return { skills: extractSkillsHeuristic(text), source: 'heuristic' };
}

/**
 * Extrae habilidades: Azure OpenAI como vía principal; heurística solo si Azure no está
 * configurado o la llamada falla (timeout, 5xx, auth, etc.).
 */
export async function processSkills(text: string): Promise<ProcessSkillsResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { skills: [], source: 'heuristic' };
  }

  if (!isAzureOpenAIConfigured()) {
    return heuristicFallback(trimmed, 'Azure OpenAI no configurado');
  }

  try {
    const skills = await extractSkillsWithAzure(trimmed);
    return { skills, source: 'azure' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return heuristicFallback(trimmed, `Azure OpenAI no disponible (${detail})`);
  }
}

/**
 * Propone equipos según perfiles y requisitos (legacy /api/ai/match-teams).
 */
export async function matchTeams(
  profiles: Profile[],
  requirements: ProjectRequirement[],
): Promise<TeamMatchProposal[]> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  return executeWithAzureOpenAIFallback<TeamMatchProposal[]>({
    operation: 'match-teams',
    fallback: (): TeamMatchProposal[] => [],
    isValid: (result) => Array.isArray(result),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            {
              role: 'system',
              content: `Genera hasta 5 propuestas de equipos en JSON:
{ "proposals": [{ "memberIds": ["id1"], "score": 85, "reasoning": "..." }] }
Usa solo IDs de perfiles existentes. Score 0-100.`,
            },
            {
              role: 'user',
              content: `Perfiles:\n${JSON.stringify(profiles, null, 2)}\n\nRequisitos:\n${JSON.stringify(requirements, null, 2)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        },
        { signal },
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Azure OpenAI no retornó contenido');
      }

      const parsed = parseJsonResponse<{ proposals: TeamMatchProposal[] }>(rawContent);
      if (!Array.isArray(parsed.proposals)) {
        throw new Error('La respuesta no incluyó propuestas de equipos.');
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
    },
  });
}
