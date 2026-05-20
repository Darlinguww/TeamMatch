import { AvailabilityParseResult, AvailabilityParser } from './types/availability-parser.types.js';

export class AvailabilityParserService {
  public constructor(
    private readonly aiParser: AvailabilityParser,
    private readonly manualParser: AvailabilityParser
  ) {}

  public async parse(text: string): Promise<AvailabilityParseResult> {
    try {
      return {
        availability: await this.aiParser.parse(text),
        source: 'azure'
      };
    } catch {
      const manualAvailability = await this.manualParser.parse(text);
      return {
        availability: manualAvailability,
        source: 'manual'
      };
    }
  }
}
