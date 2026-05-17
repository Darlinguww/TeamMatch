import { env } from '../../config/env.js';
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const payload = await response.json() as GeminiResponse;
    const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    return JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, '')) as AvailabilityDayInput[];
  }
}
