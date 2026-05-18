import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';

export interface TeamMember {
  userId: string;
  user: string;
  rol: string;
  joinedAt: string | null;
}

export interface TeamRole {
  roleId: string;
  name: string;
  skills: string[];
}

export interface TeamComposition {
  id: string;
  title: string;
  description: string;
  summary: string;
  createdAt: string | null;
  members: TeamMember[];
  roles: TeamRole[];
}

export interface ActiveTaskSummary {
  taskId: string;
  title: string;
  status: string | null;
  assigneeId: string;
}

export interface TeamMemberInput {
  userId: string;
  rol: string;
}

export interface TeamMembersPatch {
  add: TeamMemberInput[];
  remove: string[];
}

export interface TeamMembersResult {
  projectId: string;
  added: string[];
  removed: string[];
}

export interface RemoveTeamMemberResult {
  projectId: string;
  memberId: string;
  removed: true;
}

export interface TeamRepository {
  isProjectLeader(userId: string, projectId: string): Promise<boolean>;
  findCompositionForMember(userId: string, projectId: string): Promise<TeamComposition | null>;
  findMissingUserIds(userIds: string[]): Promise<string[]>;
  findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>>;
  findActiveAssignedTasks(projectId: string, userIds: string[]): Promise<ActiveTaskSummary[]>;
  addMembers(projectId: string, members: TeamMemberInput[]): Promise<string[]>;
  removeMembers(projectId: string, userIds: string[]): Promise<string[]>;
}

export class TeamService {
  public constructor(private readonly repository: TeamRepository) {}

  public async getTeamComposition(actorUserId: string, projectId: string): Promise<TeamComposition> {
    const team = await this.repository.findCompositionForMember(actorUserId, projectId);

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team;
  }

  public async updateMembers(
    actorUserId: string,
    projectId: string,
    input: { add?: unknown; remove?: unknown }
  ): Promise<TeamMembersResult> {
    const patch = this.parsePatch(input);
    const targetUserIds = [...new Set([...patch.add.map((member) => member.userId), ...patch.remove])];

    if (!(await this.repository.isProjectLeader(actorUserId, projectId))) {
      throw new ForbiddenError('Forbidden');
    }

    const missingUserIds = await this.repository.findMissingUserIds(targetUserIds);
    if (missingUserIds.length > 0) {
      throw new BadRequestError(`Usuarios no encontrados: ${missingUserIds.join(', ')}`);
    }

    if (patch.remove.length > 0) {
      const memberships = await this.repository.findProjectMemberships(projectId, patch.remove);
      const memberIds = new Set(memberships.map((membership) => membership.userId));
      const notMembers = patch.remove.filter((userId) => !memberIds.has(userId));

      if (notMembers.length > 0) {
        throw new BadRequestError(`Usuarios no pertenecen al proyecto: ${notMembers.join(', ')}`);
      }

      const leaderRemovals = memberships
        .filter((membership) => membership.rol === 'lider')
        .map((membership) => membership.userId);

      if (leaderRemovals.length > 0) {
        throw new BadRequestError(`No se puede remover al lider del proyecto: ${leaderRemovals.join(', ')}`);
      }

      this.ensureNoActiveTasks(projectId, await this.repository.findActiveAssignedTasks(projectId, patch.remove));
    }

    const added = patch.add.length > 0 ? await this.repository.addMembers(projectId, patch.add) : [];
    const removed = patch.remove.length > 0 ? await this.repository.removeMembers(projectId, patch.remove) : [];

    return { projectId, added, removed };
  }

  public async removeMember(actorUserId: string, projectId: string, memberId: string): Promise<RemoveTeamMemberResult> {
    const normalizedProjectId = projectId.trim();
    const normalizedMemberId = memberId.trim();

    if (!normalizedProjectId || !normalizedMemberId) {
      throw new BadRequestError('Project and member ids are required');
    }

    if (!(await this.repository.isProjectLeader(actorUserId, normalizedProjectId))) {
      throw new ForbiddenError('Forbidden');
    }

    const memberships = await this.repository.findProjectMemberships(normalizedProjectId, [normalizedMemberId]);
    const membership = memberships[0];

    if (!membership) {
      throw new NotFoundError('Team member not found');
    }

    if (membership.rol === 'lider') {
      throw new BadRequestError('No se puede remover al lider del proyecto');
    }

    this.ensureNoActiveTasks(
      normalizedProjectId,
      await this.repository.findActiveAssignedTasks(normalizedProjectId, [normalizedMemberId])
    );

    const [removedMemberId] = await this.repository.removeMembers(normalizedProjectId, [normalizedMemberId]);
    if (!removedMemberId) {
      throw new NotFoundError('Team member not found');
    }

    return {
      projectId: normalizedProjectId,
      memberId: removedMemberId,
      removed: true
    };
  }

  private parsePatch(input: { add?: unknown; remove?: unknown }): TeamMembersPatch {
    const add = Array.isArray(input.add)
      ? input.add
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            userId: typeof item.userId === 'string' ? item.userId.trim() : '',
            rol: typeof item.rol === 'string' && item.rol.trim() ? item.rol.trim() : 'miembro'
          }))
          .filter((item) => item.userId)
      : [];

    const remove = Array.isArray(input.remove)
      ? input.remove
          .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          .map((item) => item.trim())
      : [];

    if (add.length === 0 && remove.length === 0) {
      throw new BadRequestError('Debe enviar al menos un miembro para agregar o remover');
    }

    return { add, remove };
  }

  private ensureNoActiveTasks(projectId: string, activeTasks: ActiveTaskSummary[]): void {
    if (activeTasks.length === 0) {
      return;
    }

    throw new ConflictError('Member has active assigned tasks', {
      projectId,
      activeTaskCount: activeTasks.length,
      activeTasks
    });
  }
}
