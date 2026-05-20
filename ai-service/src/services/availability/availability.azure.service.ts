import { aiConfig, isAzureOpenAIConfigured } from '../../config/ai.config.js';
import { parseAvailabilityHeuristic } from './availability-heuristic.js';
import { getAzureOpenAIClient } from '../llm/azure-openai.client.js';
import { executeWithAzureOpenAIFallback } from '../llm/azure-openai.executor.js';

export interface ParsedAvailabilitySlot {
  day: string;
  timeSlots: Array<{ start: string; end: string }>;
}

const AVAILABILITY_SYSTEM_PROMPT = `
Eres un asistente de TeamMatch. Interpreta disponibilidad en lenguaje natural (español o inglés), aunque NO use horas exactas.

Ejemplos de interpretación:
- "tardes entre semana" → monday-friday 14:00-18:00
- "disponible por la noche en días laborables" → monday-friday 20:00-23:00
- "los fines de semana me van mejor" → saturday,sunday 09:00-18:00
- "estudio en la mañana pero libre después" → monday-friday 14:00-22:00
- "después de clases" / "after classes" → monday-friday 18:00-22:00
- "lunes de 9 a 11" → monday 09:00-11:00 (formato explícito también válido)

Días: monday,tuesday,wednesday,thursday,friday,saturday,sunday (en inglés).
Horas en HH:mm (24h). Puedes devolver varios timeSlots por día.
Si el texto es vago, infiere franjas razonables (mañana 08:00-12:00, tarde 14:00-18:00, noche 20:00-23:00).

Responde ÚNICAMENTE JSON sin markdown:
{"availability":[{"day":"monday","timeSlots":[{"start":"14:00","end":"18:00"}]}]}
`.trim();

/**
 * Parsea disponibilidad en lenguaje natural vía Azure OpenAI (gpt-4.1-mini).
 */
export async function parseAvailabilityFromText(text: string): Promise<ParsedAvailabilitySlot[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (!isAzureOpenAIConfigured()) {
    return parseAvailabilityHeuristic(trimmed);
  }

  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  const azureResult = await executeWithAzureOpenAIFallback<ParsedAvailabilitySlot[]>({
    operation: 'parse-availability',
    fallback: (): ParsedAvailabilitySlot[] => parseAvailabilityHeuristic(trimmed),
    isValid: (result) => Array.isArray(result) && result.length > 0,
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

  if (azureResult.length > 0) {
    return azureResult;
  }

  return parseAvailabilityHeuristic(trimmed);
}
