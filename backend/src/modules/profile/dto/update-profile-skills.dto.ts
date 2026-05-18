import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';

export interface UpdateProfileSkillsDto {
  skills: string[];
}

const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 100;

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateUpdateProfileSkillsDto(payload: unknown): DtoValidationResult<UpdateProfileSkillsDto> {
  const issues: ValidationIssue[] = [];
  const value: UpdateProfileSkillsDto = { skills: [] };
  const rawSkills = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).skills
      : undefined;

  if (!Array.isArray(rawSkills)) {
    return createValidationResult(value, [{ field: 'skills', message: 'Skills must be an array' }]);
  }

  const seenSkills = new Set<string>();

  rawSkills.forEach((item, index) => {
    if (typeof item !== 'string') {
      issues.push({ field: `skills.${index}`, message: 'Skill must be a string' });
      return;
    }

    const skill = normalizeSkill(item);
    const normalizedSkill = skill.toLowerCase();

    if (!skill) {
      issues.push({ field: `skills.${index}`, message: 'Skill cannot be empty' });
      return;
    }

    if (skill.length > MAX_SKILL_LENGTH) {
      issues.push({ field: `skills.${index}`, message: `Skill must be ${MAX_SKILL_LENGTH} characters or fewer` });
      return;
    }

    if (!seenSkills.has(normalizedSkill)) {
      seenSkills.add(normalizedSkill);
      value.skills.push(skill);
    }
  });

  if (value.skills.length === 0) {
    issues.push({ field: 'skills', message: 'At least one skill is required' });
  }

  if (value.skills.length > MAX_SKILLS) {
    issues.push({ field: 'skills', message: `Skills cannot exceed ${MAX_SKILLS} values` });
  }

  return createValidationResult(value, issues);
}
