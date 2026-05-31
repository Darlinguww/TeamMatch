import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { MatchmakingService, type MatchmakingRepositoryPort } from './matchmaking.service.js';
import type { MatchmakingProjectContext } from './matchmaking.types.js';

class FakeMatchmakingRepository implements MatchmakingRepositoryPort {
  public leaderId: string | null = 'leader-1';
  public contextRequests = 0;
  public lastLeaderLookupProjectId: string | null = null;

  public async findProjectLeader(projectId: string): Promise<string | null> {
    this.lastLeaderLookupProjectId = projectId;
    return this.leaderId;
  }

  public async findProjectContext(projectId: string): Promise<MatchmakingProjectContext | null> {
    this.contextRequests += 1;
    return {
      projectId,
      title: 'Demo project',
      roles: [
        {
          roleId: 'role-1',
          name: 'Frontend',
          requiredSkills: ['React']
        }
      ],
      teamMembers: [
        {
          userId: 'leader-1',
          experience: []
        }
      ],
      candidates: [
        {
          userId: 'candidate-1',
          user: 'Candidate',
          experience: [
            {
              skillName: 'React',
              yearsOfExperience: 3,
              level: 'advanced',
              category: 'frontend'
            }
          ],
          profileSkills: [],
          availability: [
            {
              day: 'monday',
              timeSlots: [{ start: '09:00', end: '17:00' }]
            }
          ],
          reputationScore: 0.8
        }
      ]
    };
  }
}

describe('MatchmakingService project matches authorization', () => {
  it('rechaza usuarios autenticados que no lideran el proyecto', async () => {
    const repository = new FakeMatchmakingRepository();
    const service = new MatchmakingService(repository);

    await expect(
      service.getProjectMatches('member-1', ' project-1 ', {
        limit: 20,
        offset: 0,
        includeExistingMembers: false
      })
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(repository.lastLeaderLookupProjectId).toBe('project-1');
    expect(repository.contextRequests).toBe(0);
  });

  it('mantiene NotFound cuando no existe un lider para el proyecto', async () => {
    const repository = new FakeMatchmakingRepository();
    repository.leaderId = null;
    const service = new MatchmakingService(repository);

    await expect(
      service.getProjectMatches('leader-1', 'project-404', {
        limit: 20,
        offset: 0,
        includeExistingMembers: false
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(repository.contextRequests).toBe(0);
  });

  it('permite al lider obtener candidatos paginados', async () => {
    const repository = new FakeMatchmakingRepository();
    const service = new MatchmakingService(repository);

    const page = await service.getProjectMatches('leader-1', 'project-1', {
      limit: 20,
      offset: 0,
      includeExistingMembers: false
    });

    expect(page.projectId).toBe('project-1');
    expect(page.matches).toHaveLength(1);
    expect(page.matches[0].userId).toBe('candidate-1');
    expect(repository.contextRequests).toBe(1);
  });
});
