import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface RegisterDto {
  user: string;
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function deriveUserName(email: string): string {
  const [localPart] = email.split('@');
  return localPart || email;
}

export function validateRegisterDto(payload: unknown): DtoValidationResult<RegisterDto> {
  const issues: ValidationIssue[] = [];
  const value: RegisterDto = {
    user: '',
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
    if (!EMAIL_PATTERN.test(value.email)) {
      issues.push({ field: 'email', message: 'Email must be valid' });
    }
  }

  if (typeof payload.password !== 'string' || !payload.password) {
    issues.push({ field: 'password', message: 'Password is required' });
  } else {
    value.password = payload.password;
    if (value.password.length < 8) {
      issues.push({ field: 'password', message: 'Password must have at least 8 characters' });
    }
  }

  if (typeof payload.user === 'string' && payload.user.trim()) {
    value.user = payload.user.trim();
  } else if (value.email) {
    value.user = deriveUserName(value.email);
  }

  return createValidationResult(value, issues);
}
