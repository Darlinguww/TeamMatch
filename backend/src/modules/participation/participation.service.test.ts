import { describe, expect, it } from 'vitest';
import { ParticipationRepository, addMemberToProjectQuery } from './participation.repository.js';
import { ParticipationService } from './participation.service.js';
import type { ParticipationRequest } from './participation.types.js';

class RecordingRepository extends ParticipationRepository {
  public adds: Array<{ rol: string; onlyIfAbsent?: boolean }> = [];
  public resolved = 0;
  public pending: (ParticipationRequest & { notificationId: string }) | null = null;

  public override async findRequestForLeaderNotification(): Promise<(ParticipationRequest & { notificationId: string }) | null> {
    return this.pending;
  }

  public override async isProjectLeader(): Promise<boolean> {
    return true;
  }

  public override async addMemberToProject(
    _projectId: string,
    _userId: string,
    rol: string,
    options?: { onlyIfAbsent?: boolean }
  ): Promise<void> {
    this.adds.push({ rol, onlyIfAbsent: options?.onlyIfAbsent });
  }

  public override async getRoleVacancy(): Promise<{ roleName: string; headcount: number; filled: number; available: number }> {
    return { roleName: 'Backend', headcount: 1, filled: 0, available: 1 };
  }

  public override async resolveParticipationRequest(): Promise<boolean> {
    this.resolved += 1;
    return true;
  }

  public override async dismissLeaderNotification(): Promise<void> {}
}

function pendingRequest(kind: ParticipationRequest['kind'], roleName: string | null): ParticipationRequest & { notificationId: string } {
  return {
    notificationId: 'notif-1',
    requestId: 'req-1',
    kind,
    status: 'pending',
    projectId: 'project-1',
    applicantUserId: 'applicant-1',
    applicantDisplayName: 'Ana',
    roleName,
    message: null,
    createdAt: '2026-05-22T00:00:00.000Z'
  };
}

describe('addMemberToProjectQuery', () => {
  it('creates a generic membership without rewriting an existing role', () => {
    const query = addMemberToProjectQuery(true);

    expect(query).toContain('ON CREATE SET membership.rol = $rol');
    expect(query).not.toMatch(/\$joinedAt\s+SET membership\.rol/);
  });

  it('still assigns a specific role onto an existing membership', () => {
    const query = addMemberToProjectQuery(false);

    expect(query).toMatch(/\$joinedAt\s+SET membership\.rol = \$rol/);
    expect(query).toContain('membership.isLeader = false');
  });
});

describe('ParticipationService.respondToNotification', () => {
  it('does not replace an approved role when the general join is approved afterwards', async () => {
    const repository = new RecordingRepository();
    repository.pending = pendingRequest('JOIN_PROJECT', null);
    const service = new ParticipationService(repository);

    const result = await service.respondToNotification('leader-1', 'notif-1', 'approved');

    expect(result).toEqual({ requestId: 'req-1', status: 'approved' });
    expect(repository.adds).toEqual([{ rol: 'miembro', onlyIfAbsent: true }]);
    expect(repository.resolved).toBe(1);
  });

  it('still assigns the requested role when that application is approved', async () => {
    const repository = new RecordingRepository();
    repository.pending = pendingRequest('ROLE_APPLICATION', 'Backend');
    const service = new ParticipationService(repository);

    await service.respondToNotification('leader-1', 'notif-1', 'approved');

    expect(repository.adds).toEqual([{ rol: 'Backend', onlyIfAbsent: undefined }]);
  });
});
