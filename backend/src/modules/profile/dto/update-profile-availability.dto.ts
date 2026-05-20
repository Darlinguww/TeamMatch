import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';
import { AvailabilityDayInput, TimeSlotInput, WEEKDAYS, Weekday } from '../types/profile.types.js';

export interface UpdateProfileAvailabilityDto {
  availability: AvailabilityDayInput[];
}

interface ParsedTimeSlot extends TimeSlotInput {
  startMinutes: number;
  endMinutes: number;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_SET = new Set<string>(WEEKDAYS);
const MAX_TIME_SLOTS_PER_DAY = 24;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasOverlappingSlots(sortedSlots: ParsedTimeSlot[]): boolean {
  return sortedSlots.some((slot, index) => index > 0 && sortedSlots[index - 1].endMinutes > slot.startMinutes);
}

function validateTimeSlot(item: unknown, dayIndex: number, slotIndex: number): {
  value: ParsedTimeSlot | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  if (!isRecord(item)) {
    return {
      value: null,
      issues: [{ field: `availability.${dayIndex}.timeSlots.${slotIndex}`, message: 'Time slot must be an object' }]
    };
  }

  const startMinutes = parseTimeToMinutes(item.start);
  const endMinutes = parseTimeToMinutes(item.end);

  if (startMinutes === null) {
    issues.push({ field: `availability.${dayIndex}.timeSlots.${slotIndex}.start`, message: 'Start must use HH:mm format' });
  }

  if (endMinutes === null) {
    issues.push({ field: `availability.${dayIndex}.timeSlots.${slotIndex}.end`, message: 'End must use HH:mm format' });
  }

  if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
    issues.push({ field: `availability.${dayIndex}.timeSlots.${slotIndex}`, message: 'Start time must be earlier than end time' });
  }

  if (issues.length > 0 || typeof item.start !== 'string' || typeof item.end !== 'string') {
    return { value: null, issues };
  }

  return {
    value: {
      start: item.start,
      end: item.end,
      startMinutes: startMinutes as number,
      endMinutes: endMinutes as number
    },
    issues
  };
}

function validateAvailabilityDay(item: unknown, index: number, seenDays: Set<string>): {
  value: AvailabilityDayInput | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  if (!isRecord(item)) {
    return {
      value: null,
      issues: [{ field: `availability.${index}`, message: 'Availability item must be an object' }]
    };
  }

  const day = typeof item.day === 'string' ? item.day.trim().toLowerCase() : '';

  if (!WEEKDAY_SET.has(day)) {
    issues.push({ field: `availability.${index}.day`, message: 'Day must be a valid weekday' });
  } else if (seenDays.has(day)) {
    issues.push({ field: `availability.${index}.day`, message: 'Day must be unique' });
  } else {
    seenDays.add(day);
  }

  if (!Array.isArray(item.timeSlots)) {
    issues.push({ field: `availability.${index}.timeSlots`, message: 'Time slots must be an array' });
    return { value: null, issues };
  }

  if (item.timeSlots.length === 0) {
    issues.push({ field: `availability.${index}.timeSlots`, message: 'At least one time slot is required for each day' });
  }

  if (item.timeSlots.length > MAX_TIME_SLOTS_PER_DAY) {
    issues.push({
      field: `availability.${index}.timeSlots`,
      message: `Time slots cannot exceed ${MAX_TIME_SLOTS_PER_DAY} per day`
    });
  }

  const slots: ParsedTimeSlot[] = [];
  item.timeSlots.forEach((slot, slotIndex) => {
    const validation = validateTimeSlot(slot, index, slotIndex);
    issues.push(...validation.issues);

    if (validation.value) {
      slots.push(validation.value);
    }
  });

  const sortedSlots = [...slots].sort((left, right) => left.startMinutes - right.startMinutes);

  if (hasOverlappingSlots(sortedSlots)) {
    issues.push({ field: `availability.${index}.timeSlots`, message: 'Time slots cannot overlap for the same day' });
  }

  if (issues.length > 0 || !WEEKDAY_SET.has(day)) {
    return { value: null, issues };
  }

  return {
    value: {
      day: day as Weekday,
      timeSlots: sortedSlots.map((slot) => ({ start: slot.start, end: slot.end }))
    },
    issues
  };
}

export function validateUpdateProfileAvailabilityDto(payload: unknown): DtoValidationResult<UpdateProfileAvailabilityDto> {
  const value: UpdateProfileAvailabilityDto = { availability: [] };

  if (!isRecord(payload)) {
    return createValidationResult(value, [{ field: 'body', message: 'Request body must be an object' }]);
  }

  if (!Array.isArray(payload.availability)) {
    return createValidationResult(value, [{ field: 'availability', message: 'Availability must be an array' }]);
  }

  if (payload.availability.length > WEEKDAYS.length) {
    return createValidationResult(value, [{ field: 'availability', message: 'Availability cannot contain more than seven days' }]);
  }

  const issues: ValidationIssue[] = [];
  const seenDays = new Set<string>();

  payload.availability.forEach((item, index) => {
    const validation = validateAvailabilityDay(item, index, seenDays);
    issues.push(...validation.issues);

    if (validation.value) {
      value.availability.push(validation.value);
    }
  });

  value.availability.sort((left, right) => WEEKDAYS.indexOf(left.day) - WEEKDAYS.indexOf(right.day));

  return createValidationResult(value, issues);
}
