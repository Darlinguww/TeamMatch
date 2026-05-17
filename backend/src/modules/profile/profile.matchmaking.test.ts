import { describe, expect, it } from 'vitest';
import { ProfileRepository } from './repositories/profile.repository.js';
import { ProfileService } from './profile.service.js';
import { PublicProfileSearchResult, SearchUsersFilters } from './types/profile.types.js';

class FakeProfileRepository {
  public async searchPublicProfiles(filters: SearchUsersFilters): Promise<PublicProfileSearchResult[]> {
    const graphProfiles: PublicProfileSearchResult[] = [
      {
        userId: 'user-senior-react',
        user: 'Senior React',
        experience: [
          { skillName: 'React', yearsOfExperience: 5, level: 'expert' },
          { skillName: 'Node', yearsOfExperience: 3, level: 'advanced' }
        ],
        availability: [{ day: 'monday', timeSlots: [{ start: '09:00', end: '12:00' }] }],
        match: {
          matchingSkills: 2,
          totalMatchingYears: 8,
          availabilityMatched: true,
          score: 330
        }
      },
      {
        userId: 'user-junior-react',
        user: 'Junior React',
        experience: [{ skillName: 'React', yearsOfExperience: 1, level: 'beginner' }],
        availability: [{ day: 'monday', timeSlots: [{ start: '09:00', end: '12:00' }] }],
        match: {
          matchingSkills: 1,
          totalMatchingYears: 1,
          availabilityMatched: true,
          score: 160
        }
      }
    ];

    return graphProfiles
      .filter((profile) => filters.skills.every((skill) => (
        profile.experience.some((item) => item.skillName.toLowerCase() === skill)
      )))
      .filter((profile) => filters.availability === null || profile.match.availabilityMatched)
      .sort((left, right) => right.match.score - left.match.score);
  }
}

describe('pipeline de matchmaking de perfiles', () => {
  it('ordena resultados por score con distintos perfiles', async () => {
    const service = new ProfileService(new FakeProfileRepository() as ProfileRepository);

    const results = await service.searchUsers({
      skills: ['react'],
      minYears: null,
      availability: null,
      limit: 20,
      offset: 0
    });

    expect(results.map((result) => result.userId)).toEqual([
      'user-senior-react',
      'user-junior-react'
    ]);
  });

  it('mantiene el score consistente con matchingSkills, experiencia y disponibilidad del grafo', async () => {
    const service = new ProfileService(new FakeProfileRepository() as ProfileRepository);

    const [bestMatch] = await service.searchUsers({
      skills: ['react', 'node'],
      minYears: null,
      availability: { day: 'monday', start: '09:30', end: '11:00' },
      limit: 20,
      offset: 0
    });

    expect(bestMatch.match).toEqual({
      matchingSkills: 2,
      totalMatchingYears: 8,
      availabilityMatched: true,
      score: 330
    });
    expect(bestMatch.match.score).toBe(
      (bestMatch.match.matchingSkills * 100) +
      (bestMatch.match.totalMatchingYears * 10) +
      50
    );
  });
});
