import { AvailabilityDayInput } from '../profile/types/profile.types.js';
import { parseAvailabilityHeuristic } from './availability-heuristic.js';
import { AvailabilityParser } from './types/availability-parser.types.js';

/**
 * Intenta interpretación flexible en lenguaje natural y, si no hay resultado,
 * delega al parser estricto (rangos explícitos con día y hora).
 */
export class NaturalLanguageAvailabilityParser implements AvailabilityParser {
  public constructor(private readonly strictParser: AvailabilityParser) {}

  public async parse(text: string): Promise<AvailabilityDayInput[]> {
    const heuristic = parseAvailabilityHeuristic(text);
    if (heuristic.length > 0) {
      return heuristic;
    }

    return this.strictParser.parse(text);
  }
}
