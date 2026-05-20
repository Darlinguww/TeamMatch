import { env } from '../../config/env.js';
import { validateUpdateProfileAvailabilityDto } from '../profile/dto/update-profile-availability.dto.js';
import { AvailabilityDayInput } from '../profile/types/profile.types.js';
import { AvailabilityParser } from './types/availability-parser.types.js';

interface GeminiResponsePart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
}

export class GeminiAvailabilityParser implements AvailabilityParser {
  public async parse(text: string): Promise<AvailabilityDayInput[]> {
    if (!env.geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), env.processingTimeoutMs);
    let response: Response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent?key=${env.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: [
                  'Extract availability from the text as strict JSON only.',
                  'Use this schema: [{"day":"monday","timeSlots":[{"start":"09:00","end":"11:00"}]}].',
                  'Allowed days are monday,tuesday,wednesday,thursday,friday,saturday,sunday.',
                  `Text: ${text}`
                ].join('\n')
              }]
            }]
          })
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const payload = await response.json() as GeminiResponse;
    const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    const parsedAvailability = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, '')) as unknown;
    const validation = validateUpdateProfileAvailabilityDto({ availability: parsedAvailability });

    if (validation.issues.length > 0) {
      throw new Error('Gemini returned invalid availability');
    }

    return validation.value.availability;
  }
}
