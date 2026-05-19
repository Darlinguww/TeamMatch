import { aiConfig } from '../config/ai.config.js';
import { getAzureOpenAIClient } from './llm/azure-openai.client.js';
import { executeWithAzureOpenAIFallback } from './llm/azure-openai.executor.js';
import type {
  NormalizedSkill,
  Profile,
  ProjectRequirement,
  TeamMatchProposal,
} from '../types/ai.types.js';

export type { Profile, ProjectRequirement } from '../types/ai.types.js';

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

/**
 * Extrae y normaliza habilidades desde texto libre (CV, descripción, etc.) vía gpt-4.1-mini.
 */
export async function processSkills(text: string): Promise<NormalizedSkill[]> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  return executeWithAzureOpenAIFallback<NormalizedSkill[]>({
    operation: 'process-skills',
    fallback: (): NormalizedSkill[] => [],
    isValid: (result) => Array.isArray(result),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            {
              role: 'system',
              content: `Eres un asistente de TeamMatch. Extrae habilidades técnicas y blandas del texto.
Responde ÚNICAMENTE con JSON: { "skills": [{ "original": "...", "normalized": "...", "category": "tecnica|blanda|otra" }] }`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.2,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        },
        { signal },
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Azure OpenAI no retornó contenido');
      }

      const parsed = parseJsonResponse<{ skills: NormalizedSkill[] }>(rawContent);
      if (!Array.isArray(parsed.skills)) {
        throw new Error('La respuesta no incluyó un arreglo de habilidades.');
      }

      return parsed.skills.map((skill) => ({
        original: skill.original ?? '',
        normalized: skill.normalized ?? skill.original ?? '',
        category: skill.category,
      }));
    },
  });
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
