import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface TaskParamsDto {
  taskId: string;
}

const MAX_TASK_ID_LENGTH = 120;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

export function validateTaskParams(payload: unknown): DtoValidationResult<TaskParamsDto> {
  const issues: ValidationIssue[] = [];
  const params = isRecord(payload) ? payload : {};
  const taskId = typeof params.id === 'string' ? params.id.trim() : '';

  if (!taskId) {
    issues.push({ field: 'id', message: 'Task id is required' });
  } else if (taskId.length > MAX_TASK_ID_LENGTH) {
    issues.push({ field: 'id', message: `Task id must be ${MAX_TASK_ID_LENGTH} characters or fewer` });
  }

  return createValidationResult({ taskId }, issues);
}
