import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../shared/errors/HttpErrors.js';
import { MatchmakingRepository } from './matchmaking.repository.js';
import { MatchmakingService } from './matchmaking.service.js';
import type { MatchmakingProjectContext } from './matchmaking.types.js';

class FakeMatchmakingRepository {
  public contextLookups = 0;

  public constructor(private readonly member: boolean) {}

  public async isUserProjectMember(): Promise<boolean> {
    return this.member;
  }

  public async findProjectContext(projectId: string): Promise<MatchmakingProjectContext | null> {
    this.contextLookups += 1;
    return {
      projectId,
      title: 'Proyecto demo',
      roles: [],
      teamMembers: [],
      candidates: []
    };
  }
}

const pageInput = { limit: 20, offset: 0, includeExistingMembers: false };

describe('MatchmakingService.getProjectMatches', () => {
  it('no carga candidatos si quien consulta no pertenece al proyecto', async () => {
    const repository = new FakeMatchmakingRepository(false);
    const service = new MatchmakingService(repository as unknown as MatchmakingRepository);

    await expect(service.getProjectMatches('outsider', 'p1', pageInput)).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.contextLookups).toBe(0);
  });

  it('devuelve el ranking solo a un miembro del proyecto', async () => {
    const repository = new FakeMatchmakingRepository(true);
    const service = new MatchmakingService(repository as unknown as MatchmakingRepository);

    const page = await service.getProjectMatches('member-1', 'p1', pageInput);

    expect(repository.contextLookups).toBe(1);
    expect(page).toMatchObject({
      projectId: 'p1',
      matches: [],
      pagination: { limit: 20, offset: 0, total: 0 }
    });
  });
});
