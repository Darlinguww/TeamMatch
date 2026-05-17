import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { AvailabilityDayInput, TimeSlotInput, WEEKDAYS, Weekday } from '../profile/types/profile.types.js';
import { AvailabilityParser } from './types/availability-parser.types.js';

const DAY_ALIASES: Record<string, Weekday> = {
  monday: 'monday',
  lunes: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  martes: 'tuesday',
  tue: 'tuesday',
  wednesday: 'wednesday',
  miercoles: 'wednesday',
  miércoles: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  jueves: 'thursday',
  thu: 'thursday',
  friday: 'friday',
  viernes: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sabado: 'saturday',
  sábado: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  domingo: 'sunday',
  sun: 'sunday'
};

const TIME_RANGE_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*(?:-|a|to|hasta)\s*(\d{1,2})(?::(\d{2}))?/i;

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function normalizeTime(hour: string, minute?: string): string {
  const parsedHour = Number(hour);
  const parsedMinute = minute === undefined ? 0 : Number(minute);

  if (!Number.isInteger(parsedHour) || !Number.isInteger(parsedMinute)) {
    throw new BadRequestError('Availability text contains an invalid time');
  }

  if (parsedHour < 0 || parsedHour > 23 || parsedMinute < 0 || parsedMinute > 59) {
    throw new BadRequestError('Availability text contains an invalid time');
  }

  return `${String(parsedHour).padStart(2, '0')}:${String(parsedMinute).padStart(2, '0')}`;
}

function parseTimeSlot(segment: string): TimeSlotInput {
  const match = TIME_RANGE_PATTERN.exec(segment);

  if (!match) {
    throw new BadRequestError('Availability text must include a time range');
  }

  const start = normalizeTime(match[1], match[2]);
  const end = normalizeTime(match[3], match[4]);

  if (start >= end) {
    throw new BadRequestError('Availability start time must be earlier than end time');
  }

  return { start, end };
}

function findDay(segment: string): Weekday {
  const dayEntry = Object.entries(DAY_ALIASES).find(([alias]) => {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedAlias}\\b`, 'i').test(segment);
  });

  if (!dayEntry) {
    throw new BadRequestError('Availability text must include a valid weekday');
  }

  return dayEntry[1];
}

export class ManualAvailabilityParser implements AvailabilityParser {
  public async parse(text: string): Promise<AvailabilityDayInput[]> {
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
      throw new BadRequestError('Availability text is required');
    }

    const byDay = new Map<Weekday, TimeSlotInput[]>();
    const segments = normalizedText.split(/[.;\n]+/).map((item) => item.trim()).filter(Boolean);

    for (const segment of segments) {
      const day = findDay(segment);
      const timeSlot = parseTimeSlot(segment);
      const existingSlots = byDay.get(day) ?? [];
      existingSlots.push(timeSlot);
      byDay.set(day, existingSlots);
    }

    return WEEKDAYS
      .filter((day) => byDay.has(day))
      .map((day) => ({
        day,
        timeSlots: (byDay.get(day) ?? []).sort((left, right) => left.start.localeCompare(right.start))
      }));
  }
}
