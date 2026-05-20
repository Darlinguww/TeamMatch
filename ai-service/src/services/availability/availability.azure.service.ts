import { aiConfig } from '../../config/ai.config.js';
import { getAzureOpenAIClient } from '../llm/azure-openai.client.js';
import { executeWithAzureOpenAIFallback } from '../llm/azure-openai.executor.js';

export interface ParsedAvailabilitySlot {
  day: string;
  timeSlots: Array<{ start: string; end: string }>;
}

const AVAILABILITY_SYSTEM_PROMPT = `
Extrae disponibilidad del texto. Responde ÚNICAMENTE con JSON sin markdown:
{"availability":[{"day":"monday","timeSlots":[{"start":"09:00","end":"11:00"}]}]}
Días permitidos: monday,tuesday,wednesday,thursday,friday,saturday,sunday.
`.trim();

/**
 * Parsea disponibilidad en lenguaje natural vía Azure OpenAI (gpt-4.1-mini).
 */
export async function parseAvailabilityFromText(text: string): Promise<ParsedAvailabilitySlot[]> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  return executeWithAzureOpenAIFallback<ParsedAvailabilitySlot[]>({
    operation: 'parse-availability',
    fallback: (): ParsedAvailabilitySlot[] => [],
    isValid: (result) => Array.isArray(result),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            { role: 'system', content: AVAILABILITY_SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        },
        { signal },
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Azure OpenAI no retornó contenido');
      }

      const parsed = JSON.parse(rawContent) as
        | ParsedAvailabilitySlot[]
        | { availability?: ParsedAvailabilitySlot[] };

      if (Array.isArray(parsed)) {
        return parsed;
      }

      return Array.isArray(parsed.availability) ? parsed.availability : [];
    },
  });
}
