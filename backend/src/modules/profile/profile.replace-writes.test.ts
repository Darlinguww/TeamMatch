import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queries, run, close } = vi.hoisted(() => {
  const queries: string[] = [];
  const run = vi.fn(async (query: string) => {
    queries.push(query);
    if (query.includes('WITH DISTINCT u')) {
      return { records: [{ get: () => 'user-1' }] };
    }

    return { records: [] };
  });
  const close = vi.fn(async () => undefined);
  return { queries, run, close };
});

vi.mock('../../database/neo4j.js', () => ({
  driver: {
    session: () => ({ run, close })
  }
}));

import { ProfileRepository } from './repositories/profile.repository.js';

describe('ProfileRepository replace writes', () => {
  const repository = new ProfileRepository();

  beforeEach(() => {
    queries.length = 0;
    run.mockClear();
    close.mockClear();
  });

  it('recreates availability once per saved slot instead of once per previous slot', async () => {
    await repository.replaceUserAvailability('user-1', [
      { day: 'monday', timeSlots: [{ start: '09:00', end: '12:00' }] },
      { day: 'tuesday', timeSlots: [{ start: '14:00', end: '18:00' }] }
    ]);

    const writeQuery = queries[0];
    expect(writeQuery).toContain('WITH DISTINCT u');
    expect(writeQuery).toContain('FOREACH (dayAvailability IN $availability');
    expect(writeQuery).toContain('FOREACH (slot IN dayAvailability.timeSlots');
    expect(writeQuery).not.toMatch(/CALL\s*\{/);
  });

  it('keeps the user row when availability is cleared', async () => {
    await repository.replaceUserAvailability('user-1', []);

    expect(queries[0]).toContain('WITH DISTINCT u');
    expect(queries[0]).toContain('RETURN u.userId AS userId');
    expect(queries[0]).not.toMatch(/UNWIND \$availability/);
  });

  it('replaces skills and experience without a per-row subquery', async () => {
    await repository.replaceUserSkills('user-1', ['React', 'Node.js']);
    await repository.replaceUserExperience('user-1', [
      { skillName: 'React', yearsOfExperience: 2, level: 'intermediate' }
    ]);

    const skillQuery = queries.find((query) => query.includes('DELETE oldSkill'));
    const experienceQuery = queries.find((query) => query.includes('DELETE oldExperience'));

    expect(skillQuery).toContain('WITH DISTINCT u');
    expect(skillQuery).toContain('FOREACH (item IN $skills');
    expect(skillQuery).not.toMatch(/CALL\s*\{/);
    expect(experienceQuery).toContain('WITH DISTINCT u');
    expect(experienceQuery).toContain('FOREACH (item IN $experience');
    expect(experienceQuery).not.toMatch(/CALL\s*\{/);
  });
});
