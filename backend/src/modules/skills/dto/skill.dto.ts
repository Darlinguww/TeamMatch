import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';
import { CreateSkillInput, UpdateSkillInput } from '../types/skill.types.js';

const MAX_SKILL_NAME_LENGTH = 100;

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function validateSkillName(payload: unknown): DtoValidationResult<CreateSkillInput | UpdateSkillInput> {
  const issues: ValidationIssue[] = [];
  const value = { name: '' };

  if (!isRecord(payload)) {
    return createValidationResult(value, [{ field: 'body', message: 'Request body must be an object' }]);
  }

  if (typeof payload.name !== 'string' || !payload.name.trim()) {
    issues.push({ field: 'name', message: 'Skill name is required' });
  } else if (payload.name.trim().length > MAX_SKILL_NAME_LENGTH) {
    issues.push({ field: 'name', message: `Skill name must be ${MAX_SKILL_NAME_LENGTH} characters or fewer` });
  } else {
    value.name = payload.name.trim();
  }

  return createValidationResult(value, issues);
}

export function validateCreateSkillDto(payload: unknown): DtoValidationResult<CreateSkillInput> {
  return validateSkillName(payload) as DtoValidationResult<CreateSkillInput>;
}

export function validateUpdateSkillDto(payload: unknown): DtoValidationResult<UpdateSkillInput> {
  return validateSkillName(payload) as DtoValidationResult<UpdateSkillInput>;
}
