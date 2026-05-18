import { getAzureOpenAIClient } from '../llm/azure-openai.client.js';
import { aiConfig } from '../../config/ai.config.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './matchmaking.prompts.js';
import { validateMatchmakingResult } from './matchmaking.validation.js';
import type {
  CandidateProfile,
  ProjectRequirements,
  MatchmakingResult,
  TeamProposal,
} from './matchmaking.types.js';

export async function runMatchmaking(
  project: ProjectRequirements,
  candidates: CandidateProfile[],
): Promise<MatchmakingResult> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  const userPrompt = buildUserPrompt(project, candidates);

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const rawContent = response.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Azure OpenAI no retornó contenido en la respuesta');
  }

  let parsed: { proposals: TeamProposal[] };
  try {
    parsed = JSON.parse(rawContent) as { proposals: TeamProposal[] };
  } catch {
    throw new Error('Respuesta de Azure OpenAI no es JSON valido');
  }

  return {
    projectId: project.projectId,
    proposals: validateMatchmakingResult(parsed).proposals,
    generatedAt: new Date().toISOString(),
  };
}
