import { randomUUID } from 'crypto';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { ParticipationRepository } from './participation.repository.js';
import type { ParticipationRequest, RoleVacancy } from './participation.types.js';

export class ParticipationService {
  public constructor(private readonly repository: ParticipationRepository) {}

  public async requestJoinProject(
    applicantUserId: string,
    projectId: string,
    rawMessage?: unknown
  ): Promise<ParticipationRequest> {
    const normalizedProjectId = projectId.trim();
    const message = this.parseOptionalMessage(rawMessage);

    const openId = await this.repository.findOpenProjectId(normalizedProjectId);
    if (!openId) {
      throw new NotFoundError('Open project not found');
    }

    if (await this.repository.isUserMember(openId, applicantUserId)) {
      throw new BadRequestError('Ya eres miembro de este proyecto');
    }

    if (await this.repository.hasPendingRequest(openId, applicantUserId, 'JOIN_PROJECT', null)) {
      throw new BadRequestError('Ya tienes una solicitud de ingreso pendiente');
    }

    return this.repository.createParticipationRequest({
      requestId: randomUUID(),
      notificationId: randomUUID(),
      kind: 'JOIN_PROJECT',
      projectId: openId,
      applicantUserId,
      roleName: null,
      message,
      createdAt: new Date().toISOString(),
    });
  }

  public async applyToRole(
    applicantUserId: string,
    projectId: string,
    rawRoleName: unknown,
    rawMessage?: unknown
  ): Promise<ParticipationRequest> {
    const normalizedProjectId = projectId.trim();
    const roleName = this.parseRoleName(rawRoleName);
    const message = this.parseOptionalMessage(rawMessage);

    const openId = await this.repository.findOpenProjectId(normalizedProjectId);
    if (!openId) {
      throw new NotFoundError('Open project not found');
    }

    if (await this.repository.isUserMember(openId, applicantUserId)) {
      throw new BadRequestError('Ya eres miembro de este proyecto');
    }

    const vacancy = await this.repository.getRoleVacancy(openId, roleName);
    if (!vacancy) {
      throw new NotFoundError('Role not found in this project');
    }

    if (vacancy.available <= 0) {
      throw new BadRequestError('No hay vacantes disponibles para este rol');
    }

    if (await this.repository.hasPendingRequest(openId, applicantUserId, 'ROLE_APPLICATION', roleName)) {
      throw new BadRequestError('Ya tienes una solicitud pendiente para este rol');
    }

    return this.repository.createParticipationRequest({
      requestId: randomUUID(),
      notificationId: randomUUID(),
      kind: 'ROLE_APPLICATION',
      projectId: openId,
      applicantUserId,
      roleName,
      message,
      createdAt: new Date().toISOString(),
    });
  }

  public async getParticipationStatus(projectId: string, userId: string) {
    const openId = await this.repository.findOpenProjectId(projectId.trim());
    if (!openId) {
      return { isMember: false, pendingJoin: false, pendingRoles: [] as string[], roleVacancies: [] as RoleVacancy[] };
    }

    const status = await this.repository.getUserParticipationStatus(openId, userId);
    return { ...status, projectId: openId };
  }

  public async respondToNotification(
    leaderUserId: string,
    notificationId: string,
    rawDecision: unknown
  ): Promise<{ requestId: string; status: string }> {
    const decision = this.parseDecision(rawDecision);
    const pending = await this.repository.findRequestForLeaderNotification(notificationId, leaderUserId);

    if (!pending) {
      throw new NotFoundError('Pending request not found for this notification');
    }

    const isLeader = await this.repository.isProjectLeader(pending.projectId, leaderUserId);
    if (!isLeader) {
      throw new ForbiddenError('Only project leaders can approve or reject requests');
    }

    const resolvedAt = new Date().toISOString();

    if (decision === 'approved') {
      if (pending.kind === 'JOIN_PROJECT') {
        await this.repository.addMemberToProject(pending.projectId, pending.applicantUserId, 'miembro');
      } else {
        const roleName = pending.roleName ?? 'miembro';
        const vacancy = await this.repository.getRoleVacancy(pending.projectId, roleName);
        if (!vacancy || vacancy.available <= 0) {
          throw new BadRequestError('No hay vacantes disponibles para este rol');
        }
        await this.repository.addMemberToProject(pending.projectId, pending.applicantUserId, roleName);
      }
    }

    const applicantType =
      pending.kind === 'JOIN_PROJECT'
        ? decision === 'approved'
          ? 'PROJECT_JOIN_APPROVED'
          : 'PROJECT_JOIN_REJECTED'
        : decision === 'approved'
          ? 'ROLE_APPLICATION_APPROVED'
          : 'ROLE_APPLICATION_REJECTED';

    const applicantMessage =
      pending.kind === 'JOIN_PROJECT'
        ? decision === 'approved'
          ? 'Tu solicitud para unirte al proyecto fue aprobada'
          : 'Tu solicitud para unirte al proyecto fue rechazada'
        : decision === 'approved'
          ? `Tu postulación al rol "${pending.roleName}" fue aprobada`
          : `Tu postulación al rol "${pending.roleName}" fue rechazada`;

    await this.repository.resolveParticipationRequest({
      requestId: pending.requestId,
      resolverUserId: leaderUserId,
      status: decision,
      resolvedAt,
      applicantNotificationId: randomUUID(),
      applicantNotificationType: applicantType,
      applicantNotificationMessage: applicantMessage,
    });

    await this.repository.dismissLeaderNotification(notificationId, leaderUserId);

    return { requestId: pending.requestId, status: decision };
  }

  private parseDecision(value: unknown): 'approved' | 'rejected' {
    if (value !== 'approved' && value !== 'rejected') {
      throw new BadRequestError('Decision must be approved or rejected');
    }
    return value;
  }

  private parseRoleName(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError('Role name is required');
    }
    return value.trim();
  }

  private parseOptionalMessage(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestError('Message must be a string');
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  }
}
