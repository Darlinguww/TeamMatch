import { getAzureOpenAIClient } from '../llm/azure-openai.client.js';
import { aiConfig } from '../../config/ai.config.js';
import { executeWithAzureOpenAIFallback } from '../llm/azure-openai.executor.js';
import { createEmptyMatchmakingResult } from '../llm/azure-openai.fallbacks.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './matchmaking.prompts.js';
import type {
  CandidateProfile,
  ProjectRequirements,
  MatchmakingResult,
  TeamProposal,
} from './matchmaking.types.js';

/**
 * Ejecuta matchmaking con Azure OpenAI.
 * Si la API falla, hace timeout o la respuesta es inválida, devuelve `proposals: []`
 * (equivalente a equipos/scores/justificaciones vacíos) para degradación controlada.
 */
export async function runMatchmaking(
  project: ProjectRequirements,
  candidates: CandidateProfile[],
): Promise<MatchmakingResult> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;
  const userPrompt = buildUserPrompt(project, candidates);

  return executeWithAzureOpenAIFallback({
    operation: 'matchmaking',
    fallback: () => createEmptyMatchmakingResult(project.projectId),
    isValid: (result) => Array.isArray(result.proposals),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        },
        { signal },
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Azure OpenAI no retornó contenido en la respuesta');
      }

      let parsed: { proposals?: TeamProposal[] };
      try {
        parsed = JSON.parse(rawContent) as { proposals?: TeamProposal[] };
      } catch {
        throw new Error(`Respuesta de Azure OpenAI no es JSON válido: ${rawContent}`);
      }

      return {
        projectId: project.projectId,
        proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
        generatedAt: new Date().toISOString(),
      };
    },
  });
}
