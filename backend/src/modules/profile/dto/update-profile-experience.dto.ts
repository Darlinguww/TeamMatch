import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';
import { SkillExperienceInput } from '../types/profile.types.js';

export interface UpdateProfileExperienceDto {
  experience: SkillExperienceInput[];
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function validateExperienceItem(item: unknown, index: number, seenSkills: Set<string>): {
  value: SkillExperienceInput | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  if (!isRecord(item)) {
    return {
      value: null,
      issues: [{ field: `experience.${index}`, message: 'Experience item must be an object' }]
    };
  }

  const skillName = typeof item.skillName === 'string' ? item.skillName.trim() : '';
  const normalizedSkillKey = skillName.toLowerCase();

  if (!skillName) {
    issues.push({ field: `experience.${index}.skillName`, message: 'Skill name is required' });
  } else if (seenSkills.has(normalizedSkillKey)) {
    issues.push({ field: `experience.${index}.skillName`, message: 'Skill experience must be unique by skill' });
  } else {
    seenSkills.add(normalizedSkillKey);
  }

  const yearsOfExperience = item.yearsOfExperience;
  if (typeof yearsOfExperience !== 'number' || !Number.isFinite(yearsOfExperience)) {
    issues.push({ field: `experience.${index}.yearsOfExperience`, message: 'Years of experience must be a number' });
  } else if (yearsOfExperience < 0 || yearsOfExperience > 80) {
    issues.push({ field: `experience.${index}.yearsOfExperience`, message: 'Years of experience must be between 0 and 80' });
  }

  let level: string | undefined;
  if (item.level !== undefined) {
    if (typeof item.level !== 'string') {
      issues.push({ field: `experience.${index}.level`, message: 'Level must be a string when provided' });
    } else if (item.level.trim().length > 50) {
      issues.push({ field: `experience.${index}.level`, message: 'Level must be 50 characters or fewer' });
    } else if (item.level.trim()) {
      level = item.level.trim();
    }
  }

  if (issues.length > 0 || typeof yearsOfExperience !== 'number') {
    return { value: null, issues };
  }

  return {
    value: {
      skillName,
      yearsOfExperience,
      ...(level ? { level } : {})
    },
    issues
  };
}

export function validateUpdateProfileExperienceDto(payload: unknown): DtoValidationResult<UpdateProfileExperienceDto> {
  const value: UpdateProfileExperienceDto = { experience: [] };

  if (!isRecord(payload)) {
    return createValidationResult(value, [{ field: 'body', message: 'Request body must be an object' }]);
  }

  if (!Array.isArray(payload.experience)) {
    return createValidationResult(value, [{ field: 'experience', message: 'Experience must be an array' }]);
  }

  const issues: ValidationIssue[] = [];
  const seenSkills = new Set<string>();

  payload.experience.forEach((item, index) => {
    const validation = validateExperienceItem(item, index, seenSkills);
    issues.push(...validation.issues);

    if (validation.value) {
      value.experience.push(validation.value);
    }
  });

  return createValidationResult(value, issues);
}
