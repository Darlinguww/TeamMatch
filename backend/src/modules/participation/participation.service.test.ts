import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../shared/errors/HttpErrors.js';
import { ParticipationRepository } from './participation.repository.js';
import { ParticipationService } from './participation.service.js';
import type { ParticipationRequest } from './participation.types.js';

const pendingRoleRequest: ParticipationRequest & { notificationId: string } = {
  requestId: 'request-1',
  notificationId: 'notification-1',
  kind: 'ROLE_APPLICATION',
  status: 'pending',
  projectId: 'project-1',
  applicantUserId: 'applicant-1',
  applicantDisplayName: 'Applicant',
  roleName: 'Backend',
  message: null,
  createdAt: '2026-05-21T00:00:00.000Z',
};

class FakeParticipationRepository {
  public findRequestForLeaderNotification = vi.fn();
  public isProjectLeader = vi.fn();
  public resolveLeaderResponse = vi.fn();
  public getRoleVacancy = vi.fn();
  public addMemberToProject = vi.fn();
  public resolveParticipationRequest = vi.fn();
  public dismissLeaderNotification = vi.fn();
}

describe('ParticipationService approval workflow', () => {
  let repository: FakeParticipationRepository;
  let service: ParticipationService;

  beforeEach(() => {
    repository = new FakeParticipationRepository();
    repository.findRequestForLeaderNotification.mockResolvedValue(pendingRoleRequest);
    repository.isProjectLeader.mockResolvedValue(true);
    repository.resolveLeaderResponse.mockResolvedValue(true);
    service = new ParticipationService(repository as unknown as ParticipationRepository);
  });

  it('resolves approvals through one guarded repository write', async () => {
    await expect(
      service.respondToNotification('leader-1', 'notification-1', 'approved')
    ).resolves.toEqual({ requestId: 'request-1', status: 'approved' });

    expect(repository.resolveLeaderResponse).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'request-1',
      notificationId: 'notification-1',
      leaderUserId: 'leader-1',
      projectId: 'project-1',
      applicantUserId: 'applicant-1',
      kind: 'ROLE_APPLICATION',
      roleName: 'Backend',
      status: 'approved',
      resolverUserId: 'leader-1',
      applicantNotificationType: 'ROLE_APPLICATION_APPROVED',
    }));
    expect(repository.getRoleVacancy).not.toHaveBeenCalled();
    expect(repository.addMemberToProject).not.toHaveBeenCalled();
    expect(repository.resolveParticipationRequest).not.toHaveBeenCalled();
    expect(repository.dismissLeaderNotification).not.toHaveBeenCalled();
  });

  it('surfaces a conflict when the guarded approval cannot resolve the pending request', async () => {
    repository.resolveLeaderResponse.mockResolvedValue(false);

    await expect(
      service.respondToNotification('leader-1', 'notification-1', 'approved')
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
