import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface UpdateTaskStatusDto {
  status: string;
}

const MAX_STATUS_LENGTH = 80;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

export function validateUpdateTaskStatusDto(payload: unknown): DtoValidationResult<UpdateTaskStatusDto> {
  const issues: ValidationIssue[] = [];
  const body = isRecord(payload) ? payload : {};
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!status) {
    issues.push({ field: 'status', message: 'Status is required' });
  } else if (status.length > MAX_STATUS_LENGTH) {
    issues.push({ field: 'status', message: `Status must be ${MAX_STATUS_LENGTH} characters or fewer` });
  }

  return createValidationResult({ status }, issues);
}
