import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface ProjectMatchRequestDto {
  projectId: string;
  limit: number;
  offset: number;
  includeExistingMembers: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;
const MAX_ID_LENGTH = 120;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function getSingleValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string');
  }

  return undefined;
}

function parseProjectId(value: unknown, issues: ValidationIssue[]): string {
  const projectId = typeof value === 'string' ? value.trim() : '';

  if (!projectId) {
    issues.push({ field: 'id', message: 'id is required' });
    return '';
  }

  if (projectId.length > MAX_ID_LENGTH) {
    issues.push({ field: 'id', message: `id must be ${MAX_ID_LENGTH} characters or fewer` });
  }

  return projectId;
}

function parseOptionalInteger(value: unknown, field: string, fallback: number, max: number, issues: ValidationIssue[]): number {
  const rawValue = getSingleValue(value);

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

function parseOptionalBoolean(value: unknown, field: string, fallback: boolean, issues: ValidationIssue[]): boolean {
  const rawValue = getSingleValue(value);

  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedValue)) {
    return false;
  }

  issues.push({ field, message: `${field} must be a boolean` });
  return fallback;
}

export function validateProjectMatchRequestDto(payload: unknown): DtoValidationResult<ProjectMatchRequestDto> {
  const issues: ValidationIssue[] = [];
  const request = isRecord(payload) ? payload : {};
  const params = isRecord(request.params) ? request.params : {};
  const query = isRecord(request.query) ? request.query : {};
  const limit = parseOptionalInteger(query.limit, 'limit', DEFAULT_LIMIT, MAX_LIMIT, issues);
  const value: ProjectMatchRequestDto = {
    projectId: parseProjectId(params.id, issues),
    limit: limit === 0 ? DEFAULT_LIMIT : limit,
    offset: parseOptionalInteger(query.offset, 'offset', 0, MAX_OFFSET, issues),
    includeExistingMembers: parseOptionalBoolean(query.includeExistingMembers, 'includeExistingMembers', false, issues)
  };

  return createValidationResult(value, issues);
}
