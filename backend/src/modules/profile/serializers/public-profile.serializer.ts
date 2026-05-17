import { PublicProfile, SkillExperience } from '../types/profile.types.js';

export interface PublicProfileRecord {
  userId: unknown;
  user: unknown;
  experience: unknown;
}

function serializeExperienceItem(item: unknown): SkillExperience | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return null;
  }

  const rawItem = item as Record<string, unknown>;
  const skillName = typeof rawItem.skillName === 'string' ? rawItem.skillName : '';

  if (!skillName) {
    return null;
  }

  return {
    skillName,
    yearsOfExperience: Number(rawItem.yearsOfExperience ?? 0),
    level: typeof rawItem.level === 'string' && rawItem.level ? rawItem.level : null
  };
}

export function serializePublicProfile(record: PublicProfileRecord): PublicProfile {
  const experience = Array.isArray(record.experience)
    ? record.experience
      .map(serializeExperienceItem)
      .filter((item): item is SkillExperience => item !== null)
    : [];

  return {
    userId: String(record.userId),
    user: typeof record.user === 'string' ? record.user : '',
    experience
  };
}
