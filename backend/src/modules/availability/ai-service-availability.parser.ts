import { validateUpdateProfileAvailabilityDto } from '../profile/dto/update-profile-availability.dto.js';
import { AvailabilityDayInput } from '../profile/types/profile.types.js';
import { AvailabilityParser } from './types/availability-parser.types.js';

interface AiServiceAvailabilityResponse {
  availability?: unknown;
}

/**
 * Delega el parseo de disponibilidad al microservicio de IA (Azure OpenAI).
 */
export class AiServiceAvailabilityParser implements AvailabilityParser {
  public constructor(private readonly aiServiceUrl: string) {}

  public async parse(text: string): Promise<AvailabilityDayInput[]> {
    const baseUrl = this.aiServiceUrl.replace(/\/$/, '');
    const url = `${baseUrl}/api/ai/parse-availability`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`AI service availability parse failed with status ${response.status}`);
    }

    const payload = await response.json() as AiServiceAvailabilityResponse;
    const validation = validateUpdateProfileAvailabilityDto({ availability: payload.availability });

    if (validation.issues.length > 0) {
      throw new Error('AI service returned invalid availability');
    }

    return validation.value.availability;
  }
}
