import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';
import { SearchUsersFilters, WEEKDAYS, Weekday } from '../types/profile.types.js';

export interface SearchUsersDto extends SearchUsersFilters {}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_SET = new Set<string>(WEEKDAYS);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;
const MAX_SKILLS = 20;
const MAX_SKILL_LENGTH = 100;

function getQueryValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function getSingleQueryValue(value: unknown): string | undefined {
  const values = getQueryValues(value);
  return values.length > 0 ? values[0] : undefined;
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function parseOptionalInteger(value: unknown, field: string, fallback: number, max: number, issues: ValidationIssue[]): number {
  const rawValue = getSingleQueryValue(value);

  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > max) {
    issues.push({ field, message: `${field} must be an integer between 0 and ${max}` });
    return fallback;
  }

  return parsedValue;
}

function parseSkills(value: unknown, issues: ValidationIssue[]): string[] {
  const skills = getQueryValues(value)
    .flatMap((item) => item.split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const uniqueSkills = Array.from(new Set(skills));

  if (uniqueSkills.length > MAX_SKILLS) {
    issues.push({ field: 'skills', message: `Skills cannot exceed ${MAX_SKILLS} values` });
  }

  if (uniqueSkills.some((skill) => skill.length > MAX_SKILL_LENGTH)) {
    issues.push({ field: 'skills', message: `Each skill must be ${MAX_SKILL_LENGTH} characters or fewer` });
  }

  return uniqueSkills;
}

function parseMinYears(value: unknown, issues: ValidationIssue[]): number | null {
  const rawValue = getSingleQueryValue(value);

  if (rawValue === undefined || rawValue.trim() === '') {
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    issues.push({ field: 'minYears', message: 'minYears must be a positive number' });
    return null;
  }

  return parsedValue;
}

function parseAvailabilityFilter(payload: Record<string, unknown>, issues: ValidationIssue[]): SearchUsersFilters['availability'] {
  const day = getSingleQueryValue(payload.day)?.trim().toLowerCase();
  const start = getSingleQueryValue(payload.start)?.trim();
  const end = getSingleQueryValue(payload.end)?.trim();
  const hasAnyAvailabilityFilter = Boolean(day || start || end);

  if (!hasAnyAvailabilityFilter) {
    return null;
  }

  if (!day || !start || !end) {
    issues.push({ field: 'availability', message: 'day, start, and end are required when filtering by availability' });
    return null;
  }

  if (!WEEKDAY_SET.has(day)) {
    issues.push({ field: 'day', message: 'day must be a valid weekday' });
  }

  if (!TIME_PATTERN.test(start)) {
    issues.push({ field: 'start', message: 'start must use HH:mm format' });
  }

  if (!TIME_PATTERN.test(end)) {
    issues.push({ field: 'end', message: 'end must use HH:mm format' });
  }

  if (TIME_PATTERN.test(start) && TIME_PATTERN.test(end) && parseTimeToMinutes(start) >= parseTimeToMinutes(end)) {
    issues.push({ field: 'availability', message: 'start must be earlier than end' });
  }

  if (issues.some((issue) => ['availability', 'day', 'start', 'end'].includes(issue.field))) {
    return null;
  }

  return {
    day: day as Weekday,
    start,
    end
  };
}

export function validateSearchUsersDto(payload: unknown): DtoValidationResult<SearchUsersDto> {
  const issues: ValidationIssue[] = [];
  const query = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const limit = parseOptionalInteger(query.limit, 'limit', DEFAULT_LIMIT, MAX_LIMIT, issues);
  const offset = parseOptionalInteger(query.offset, 'offset', 0, MAX_OFFSET, issues);
  const value: SearchUsersDto = {
    skills: parseSkills(query.skills, issues),
    minYears: parseMinYears(query.minYears, issues),
    availability: parseAvailabilityFilter(query, issues),
    limit: limit === 0 ? DEFAULT_LIMIT : limit,
    offset
  };

  return createValidationResult(value, issues);
}
