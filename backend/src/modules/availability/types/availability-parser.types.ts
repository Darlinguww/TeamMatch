import { AvailabilityDayInput } from '../../profile/types/profile.types.js';

export interface AvailabilityParseResult {
  availability: AvailabilityDayInput[];
  source: 'azure' | 'manual';
}

export interface AvailabilityParser {
  parse(text: string): Promise<AvailabilityDayInput[]>;
}
