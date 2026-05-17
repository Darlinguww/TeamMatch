import { describe, expect, it } from 'vitest';
import { AvailabilityParserService } from './availability-parser.service.js';
import { ManualAvailabilityParser } from './manual-availability.parser.js';
import { AvailabilityParser } from './types/availability-parser.types.js';

class FailingGeminiParser implements AvailabilityParser {
  public async parse() {
    throw new Error('Gemini unavailable');
  }
}

class SuccessfulGeminiParser implements AvailabilityParser {
  public async parse() {
    return [{
      day: 'friday' as const,
      timeSlots: [{ start: '08:00', end: '10:00' }]
    }];
  }
}

describe('Availability parsing', () => {
  it('parsea disponibilidad en espanol con formato "lunes de 9 a 11"', async () => {
    const parser = new ManualAvailabilityParser();

    await expect(parser.parse('lunes de 9 a 11')).resolves.toEqual([{
      day: 'monday',
      timeSlots: [{ start: '09:00', end: '11:00' }]
    }]);
  });

  it('parsea disponibilidad en ingles con formato de rango horario', async () => {
    const parser = new ManualAvailabilityParser();

    await expect(parser.parse('Tuesday 14:30-16:00')).resolves.toEqual([{
      day: 'tuesday',
      timeSlots: [{ start: '14:30', end: '16:00' }]
    }]);
  });

  it('parsea varios dias separados por punto y coma', async () => {
    const parser = new ManualAvailabilityParser();

    await expect(parser.parse('miercoles 10:00 hasta 12:00; friday 18 to 20')).resolves.toEqual([
      { day: 'wednesday', timeSlots: [{ start: '10:00', end: '12:00' }] },
      { day: 'friday', timeSlots: [{ start: '18:00', end: '20:00' }] }
    ]);
  });

  it('usa Gemini cuando esta disponible', async () => {
    const service = new AvailabilityParserService(new SuccessfulGeminiParser(), new ManualAvailabilityParser());

    await expect(service.parse('viernes de 8 a 10')).resolves.toEqual({
      source: 'gemini',
      availability: [{
        day: 'friday',
        timeSlots: [{ start: '08:00', end: '10:00' }]
      }]
    });
  });

  it('hace fallback manual vacio cuando Gemini falla', async () => {
    const service = new AvailabilityParserService(new FailingGeminiParser(), new ManualAvailabilityParser());

    await expect(service.parse('viernes de 8 a 10')).resolves.toEqual({
      source: 'manual',
      availability: []
    });
  });
});
