import { describe, expect, it, vi } from 'vitest';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TeamDetailRepository } from './repositories/team-detail.repository.js';
import { TeamsService } from './teams.service.js';

/**
 * HU-1 (requisito técnico): GET /teams/:id con composición actual y alerta al remover
 * miembro con tareas activas (ConflictError con detalle de tareas).
 */
describe('HU-1 — composición de equipo y remoción segura', () => {
  const teamId = 'project-1';
  const memberId = 'member-1';
  const leaderId = 'leader-1';

  it('devuelve la composición actual del equipo (miembros y roles)', async () => {
    const mockRepo = {
      findCompositionById: vi.fn().mockResolvedValue({
        id: teamId,
        title: 'Proyecto Alpha',
        description: 'Desc',
        summary: 'Resumen',
        createdAt: '2026-05-01T00:00:00.000Z',
        members: [
          { userId: 'leader-1', user: 'Líder', joinedAt: '2026-05-01T00:00:00.000Z', rol: 'leader' },
          { userId: memberId, user: 'Miembro', joinedAt: '2026-05-02T00:00:00.000Z', rol: 'member' }
        ],
        roles: [{ roleId: 'r1', name: 'Backend', skills: ['Node'], headcount: 2 }]
      }),
      removeMemberIfNoActiveTasks: vi.fn()
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);
    const team = await service.getTeamComposition(teamId);

    expect(mockRepo.findCompositionById).toHaveBeenCalledWith(teamId);
    expect(team.members).toHaveLength(2);
    expect(team.roles[0]).toMatchObject({ name: 'Backend', headcount: 2 });
  });

  it('bloquea la remoción y expone las tareas activas en el error (alerta)', async () => {
    const mockRepo = {
      findCompositionById: vi.fn(),
      removeMemberIfNoActiveTasks: vi.fn().mockResolvedValue({
        teamId,
        memberId,
        membershipExists: true,
        actorIsLeader: true,
        memberIsLeader: false,
        activeTasks: [
          { taskId: 'task-9', title: 'API login', status: 'en progreso' }
        ]
      })
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);

    const rejection = service.removeMember(leaderId, teamId, memberId);
    await expect(rejection).rejects.toBeInstanceOf(ConflictError);
    await expect(rejection).rejects.toMatchObject({
      details: {
        activeTaskCount: 1,
        activeTasks: expect.arrayContaining([
          expect.objectContaining({ taskId: 'task-9', status: 'en progreso' })
        ])
      }
    });
  });

  it('permite remover cuando no hay tareas activas', async () => {
    const mockRepo = {
      findCompositionById: vi.fn(),
      removeMemberIfNoActiveTasks: vi.fn().mockResolvedValue({
        teamId,
        memberId,
        membershipExists: true,
        actorIsLeader: true,
        memberIsLeader: false,
        activeTasks: []
      })
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);
    const result = await service.removeMember(leaderId, teamId, memberId);

    expect(result).toEqual({ teamId, memberId, removed: true });
  });

  it('bloquea la remoción si el actor no es líder del proyecto', async () => {
    const mockRepo = {
      findCompositionById: vi.fn(),
      removeMemberIfNoActiveTasks: vi.fn().mockResolvedValue({
        teamId,
        memberId,
        membershipExists: true,
        actorIsLeader: false,
        memberIsLeader: false,
        activeTasks: []
      })
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);

    await expect(service.removeMember('intruder-1', teamId, memberId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('bloquea la remoción del líder del proyecto', async () => {
    const mockRepo = {
      findCompositionById: vi.fn(),
      removeMemberIfNoActiveTasks: vi.fn().mockResolvedValue({
        teamId,
        memberId: leaderId,
        membershipExists: true,
        actorIsLeader: true,
        memberIsLeader: true,
        activeTasks: []
      })
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);

    await expect(service.removeMember(leaderId, teamId, leaderId)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('devuelve 404 si el equipo no existe', async () => {
    const mockRepo = {
      findCompositionById: vi.fn().mockResolvedValue(null),
      removeMemberIfNoActiveTasks: vi.fn()
    } as unknown as TeamDetailRepository;

    const service = new TeamsService(mockRepo);
    await expect(service.getTeamComposition('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
