import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestError, ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { TeamMemberInput, TeamRepository, TeamService } from './team.service.js';

class FakeTeamRepository implements TeamRepository {
  public leaders = new Map<string, string>();
  public users = new Set<string>();
  public memberships = new Map<string, Map<string, string>>();

  public async isProjectLeader(userId: string, projectId: string): Promise<boolean> {
    return this.leaders.get(projectId) === userId;
  }

  public async findMissingUserIds(userIds: string[]): Promise<string[]> {
    return userIds.filter((userId) => !this.users.has(userId));
  }

  public async findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>> {
    const memberships = this.memberships.get(projectId) ?? new Map<string, string>();
    return userIds
      .filter((userId) => memberships.has(userId))
      .map((userId) => ({ userId, rol: memberships.get(userId) ?? '' }));
  }

  public async addMembers(projectId: string, members: TeamMemberInput[]): Promise<string[]> {
    const memberships = this.memberships.get(projectId) ?? new Map<string, string>();
    members.forEach((member) => memberships.set(member.userId, member.rol));
    this.memberships.set(projectId, memberships);
    return members.map((member) => member.userId);
  }

  public async removeMembers(projectId: string, userIds: string[]): Promise<string[]> {
    const memberships = this.memberships.get(projectId) ?? new Map<string, string>();
    userIds.forEach((userId) => memberships.delete(userId));
    return userIds;
  }
}

let repository: FakeTeamRepository;
let service: TeamService;

describe('TeamService integrantes', () => {
  beforeEach(() => {
    repository = new FakeTeamRepository();
    repository.leaders.set('project-1', 'leader-1');
    repository.users = new Set(['leader-1', 'member-1', 'member-2']);
    repository.memberships.set('project-1', new Map([
      ['leader-1', 'lider'],
      ['member-1', 'miembro']
    ]));
    service = new TeamService(repository);
  });

  it('permite al lider agregar y remover integrantes', async () => {
    await expect(service.updateMembers('leader-1', 'project-1', {
      add: [{ userId: 'member-2', rol: 'qa' }],
      remove: ['member-1']
    })).resolves.toEqual({
      projectId: 'project-1',
      added: ['member-2'],
      removed: ['member-1']
    });
  });

  it('rechaza cambios de integrantes hechos por no lideres', async () => {
    await expect(service.updateMembers('member-1', 'project-1', {
      add: [{ userId: 'member-2' }]
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('evita remover al lider del proyecto', async () => {
    await expect(service.updateMembers('leader-1', 'project-1', {
      remove: ['leader-1']
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('valida usuarios inexistentes y payloads vacios', async () => {
    await expect(service.updateMembers('leader-1', 'project-1', {
      add: [{ userId: 'missing-user' }]
    })).rejects.toBeInstanceOf(BadRequestError);

    await expect(service.updateMembers('leader-1', 'project-1', {})).rejects.toBeInstanceOf(BadRequestError);
  });
});
