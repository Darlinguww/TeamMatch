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
      await this.tryManualParseForValidation(text);

      return {
        availability: [],
        source: 'manual'
      };
    }
  }

  private async tryManualParseForValidation(text: string): Promise<void> {
    await this.manualParser.parse(text);
  }
}
