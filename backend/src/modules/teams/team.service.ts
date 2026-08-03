import { BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors/HttpErrors.js';

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

export interface TeamMemberActiveTask {
  userId: string;
  taskId: string;
  title: string;
  status: string;
}

export interface TeamRepository {
  isProjectLeader(userId: string, projectId: string): Promise<boolean>;
  findMissingUserIds(userIds: string[]): Promise<string[]>;
  listProjectMemberships(projectId: string): Promise<Array<{ userId: string; rol: string }>>;
  getRoleVacancies(
    projectId: string
  ): Promise<Array<{ roleName: string; headcount: number; filled: number; available: number }>>;
  findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>>;
  findActiveAssignedTasks(projectId: string, userIds: string[]): Promise<TeamMemberActiveTask[]>;
  addMembers(projectId: string, members: TeamMemberInput[]): Promise<string[]>;
  removeMembers(projectId: string, userIds: string[]): Promise<string[]>;
}

function normalizeRoleName(role: string): string {
  return role.replace(/\s*#\d+\s*$/i, '').trim().toLowerCase();
}

function isLeaderRole(role: string): boolean {
  const key = normalizeRoleName(role);
  return key === 'lider' || key === 'leader' || key === 'líder';
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
        .filter((membership) => isLeaderRole(membership.rol))
        .map((membership) => membership.userId);

      if (leaderRemovals.length > 0) {
        throw new BadRequestError(`No se puede remover al lider del proyecto: ${leaderRemovals.join(', ')}`);
      }

      const activeTasks = await this.repository.findActiveAssignedTasks(projectId, patch.remove);
      if (activeTasks.length > 0) {
        throw new ConflictError('Member has active assigned tasks', {
          projectId,
          activeTaskCount: activeTasks.length,
          activeTasks
        });
      }
    }

    const membersToAdd = await this.validateAndFilterAdds(projectId, patch.add);
    const added = membersToAdd.length > 0 ? await this.repository.addMembers(projectId, membersToAdd) : [];
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

  private async validateAndFilterAdds(
    projectId: string,
    requested: TeamMemberInput[]
  ): Promise<TeamMemberInput[]> {
    if (requested.length === 0) {
      return [];
    }

    const existing = await this.repository.listProjectMemberships(projectId);
    const existingIds = new Set(existing.map((member) => member.userId));
    const pending = requested.filter((member) => !existingIds.has(member.userId));

    if (pending.length === 0) {
      return [];
    }

    const vacancies = await this.repository.getRoleVacancies(projectId);
    const availableByRole = new Map(
      vacancies.map((vacancy) => [normalizeRoleName(vacancy.roleName), vacancy.available])
    );
    const totalAvailable = vacancies.reduce((sum, vacancy) => sum + vacancy.available, 0);

    if (totalAvailable <= 0) {
      throw new BadRequestError('No hay vacantes disponibles en el proyecto');
    }

    if (pending.length > totalAvailable) {
      throw new BadRequestError(
        `Solo hay ${totalAvailable} vacante(s) disponible(s); no se pueden agregar ${pending.length} miembros nuevos`
      );
    }

    const accepted: TeamMemberInput[] = [];

    for (const member of pending) {
      const roleKey = normalizeRoleName(member.rol);
      if (isLeaderRole(member.rol)) {
        throw new BadRequestError('No se puede asignar un miembro con rol de lider mediante matchmaking');
      }

      const available = availableByRole.get(roleKey) ?? 0;
      if (available <= 0) {
        throw new BadRequestError(`No hay vacantes disponibles para el rol: ${member.rol}`);
      }

      availableByRole.set(roleKey, available - 1);
      accepted.push({
        userId: member.userId,
        rol: member.rol.replace(/\s*#\d+\s*$/i, '').trim() || member.rol
      });
    }

    return accepted;
  }
}
