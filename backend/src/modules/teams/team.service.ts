import { BadRequestError, ForbiddenError } from '../../shared/errors/HttpErrors.js';

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

/** Resultado de asignación vía matchmaking (SCRUM-167). */
export interface MatchmakingAssignment {
  userId: string;
  projectId: string;
  rol: string;
  fechaAsignacion: string;
}

export interface TeamRepository {
  isProjectLeader(userId: string, projectId: string): Promise<boolean>;
  findMissingUserIds(userIds: string[]): Promise<string[]>;
  findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>>;
  assignMemberFromMatchmaking(
    userId: string,
    projectId: string,
    rol: string,
  ): Promise<MatchmakingAssignment | null>;
  addMembers(projectId: string, members: TeamMemberInput[]): Promise<string[]>;
  removeMembers(projectId: string, userIds: string[]): Promise<string[]>;
}

export class TeamService {
  public constructor(private readonly repository: TeamRepository) {}

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
    }

    const added = patch.add.length > 0 ? await this.repository.addMembers(projectId, patch.add) : [];
    const removed = patch.remove.length > 0 ? await this.repository.removeMembers(projectId, patch.remove) : [];

    return { projectId, added, removed };
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
}
