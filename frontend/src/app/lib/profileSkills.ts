import type { Skill } from './mockData';
import { isSkillLevel, levelFromYears, mapApiCategory } from './skillCatalog';

export interface ApiSkillExperience {
  skillName: string;
  yearsOfExperience?: number | null;
  level?: string | null;
  category?: string | null;
}

export function resolveStoredSkillLevel(
  level: string | null | undefined,
  years: number | null | undefined
): Skill['level'] {
  if (isSkillLevel(level)) return level;
  return levelFromYears(Number(years ?? 0)) ?? 'intermediate';
}

export function mapApiProfileSkills(skillNames: string[], experience: ApiSkillExperience[] = []): Skill[] {
  const byName = new Map<string, ApiSkillExperience>();

  for (const item of experience) {
    const key = item.skillName.trim().toLowerCase();
    if (key) byName.set(key, item);
  }

  return skillNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name, index) => {
      const stored = byName.get(name.toLowerCase());
      return {
        id: `sk_${index}`,
        name,
        category: mapApiCategory(stored?.category ?? undefined),
        level: resolveStoredSkillLevel(stored?.level, stored?.yearsOfExperience),
      };
    });
}

/** Same aggregate the profile screen showed after a refresh, now also used after login. */
export function displayedExperienceYears(skillCount: number, experience: ApiSkillExperience[]): number {
  if (skillCount <= 0) return 0;

  const total = experience.reduce(
    (sum, item) => sum + Math.max(0, Number(item.yearsOfExperience) || 0),
    0
  );

  return Math.round(total / skillCount);
}
