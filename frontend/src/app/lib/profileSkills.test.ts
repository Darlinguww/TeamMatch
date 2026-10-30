import { describe, expect, it } from 'vitest';
import { buildExperiencePayload } from './profileApi';
import { displayedExperienceYears, mapApiProfileSkills } from './profileSkills';

describe('profile skill hydration', () => {
  const storedExperience = [
    { skillName: 'React', yearsOfExperience: 8, level: 'expert' },
    { skillName: 'Python', yearsOfExperience: 5, level: null },
    { skillName: 'SQL', yearsOfExperience: 1, level: 'beginner' },
  ];

  it('keeps stored levels when a session is restored from the API', () => {
    const skills = mapApiProfileSkills(['React', 'Python', 'SQL', 'Git'], storedExperience);

    expect(skills.map((skill) => skill.level)).toEqual([
      'expert',
      'advanced',
      'beginner',
      'intermediate',
    ]);
    expect(displayedExperienceYears(skills.length, storedExperience)).toBe(4);
  });

  it('writes the restored levels back instead of collapsing every skill to 2 years', () => {
    const skills = mapApiProfileSkills(['React', 'Python', 'SQL'], storedExperience);

    expect(buildExperiencePayload(skills, 0)).toEqual([
      { skillName: 'React', yearsOfExperience: 8, level: 'expert' },
      { skillName: 'Python', yearsOfExperience: 5, level: 'advanced' },
      { skillName: 'SQL', yearsOfExperience: 1, level: 'beginner' },
    ]);
  });
});
