import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface LoginDto {
  email: string;
  password: string;
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

export function validateLoginDto(payload: unknown): DtoValidationResult<LoginDto> {
  const issues: ValidationIssue[] = [];
  const value: LoginDto = {
    email: '',
    password: ''
  };

  if (!isRecord(payload)) {
    return createValidationResult(value, [{ field: 'body', message: 'Request body must be an object' }]);
  }

  if (typeof payload.email !== 'string' || !payload.email.trim()) {
    issues.push({ field: 'email', message: 'Email is required' });
  } else {
    value.email = payload.email.trim().toLowerCase();
  }

  if (typeof payload.password !== 'string' || !payload.password) {
    issues.push({ field: 'password', message: 'Password is required' });
  } else {
    value.password = payload.password;
  }

  return createValidationResult(value, issues);
}
