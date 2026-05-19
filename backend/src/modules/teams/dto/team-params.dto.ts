import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface TeamIdParamsDto {
  teamId: string;
}

export interface RemoveTeamMemberParamsDto extends TeamIdParamsDto {
  memberId: string;
}

const MAX_ID_LENGTH = 120;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function parseRequiredId(value: unknown, field: string, issues: ValidationIssue[]): string {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    issues.push({ field, message: `${field} is required` });
    return '';
  }

  if (normalizedValue.length > MAX_ID_LENGTH) {
    issues.push({ field, message: `${field} must be ${MAX_ID_LENGTH} characters or fewer` });
  }

  return normalizedValue;
}

export function validateTeamIdParams(payload: unknown): DtoValidationResult<TeamIdParamsDto> {
  const issues: ValidationIssue[] = [];
  const params = isRecord(payload) ? payload : {};
  const value: TeamIdParamsDto = {
    teamId: parseRequiredId(params.id, 'id', issues)
  };

  return createValidationResult(value, issues);
}

export function validateRemoveTeamMemberParams(payload: unknown): DtoValidationResult<RemoveTeamMemberParamsDto> {
  const issues: ValidationIssue[] = [];
  const params = isRecord(payload) ? payload : {};
  const value: RemoveTeamMemberParamsDto = {
    teamId: parseRequiredId(params.id, 'id', issues),
    memberId: parseRequiredId(params.memberId, 'memberId', issues)
  };

  return createValidationResult(value, issues);
}
