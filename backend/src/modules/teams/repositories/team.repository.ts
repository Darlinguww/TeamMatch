import { driver } from '../../../database/neo4j.js';
import {
  ActiveTaskSummary,
  TeamComposition,
  TeamMemberInput,
  TeamRepository as TeamRepositoryContract
} from '../team.service.js';

const INACTIVE_TASK_STATUSES = [
  'done',
  'completed',
  'cancelled',
  'canceled',
  'closed',
  'finalizada',
  'finalizado',
  'completada',
  'completado',
  'cancelada',
  'cancelado',
  'cerrada',
  'cerrado'
];

export class Neo4jTeamRepository implements TeamRepositoryContract {
  public async isProjectLeader(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A {rol: 'lider'}]->(:Proyecto {projectId: $projectId})
         RETURN 1 AS found
         LIMIT 1`,
        { userId, projectId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async findCompositionForMember(userId: string, projectId: string): Promise<TeamComposition | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(project:Proyecto {projectId: $projectId})
         CALL {
           WITH project
           OPTIONAL MATCH (member:Usuario)-[membership:PERTENECE_A]->(project)
           WITH member, membership
           ORDER BY toLower(coalesce(member.user, '')), member.userId
           RETURN [item IN collect(
             CASE
               WHEN member IS NULL THEN null
               ELSE {
                 userId: member.userId,
                 user: member.user,
                 rol: coalesce(membership.rol, 'miembro'),
                 joinedAt: coalesce(membership.joinedAt, membership.createdAt)
               }
             END
           ) WHERE item IS NOT NULL] AS members
         }
         CALL {
           WITH project
           OPTIONAL MATCH (project)-[:TIENE_ROL]->(role:Rol)
           OPTIONAL MATCH (role)-[:REQUIERE]->(skill:Habilidad)
           WITH role, [skillName IN collect(DISTINCT skill.name) WHERE skillName IS NOT NULL] AS skills
           ORDER BY toLower(coalesce(role.name, '')), role.roleId
           RETURN [item IN collect(
             CASE
               WHEN role IS NULL THEN null
               ELSE {
                 roleId: role.roleId,
                 name: role.name,
                 skills: skills
               }
             END
           ) WHERE item IS NOT NULL] AS roles
         }
         RETURN project.projectId AS id,
                project.title AS title,
                project.description AS description,
                project.summary AS summary,
                project.createdAt AS createdAt,
                members,
                roles
         LIMIT 1`,
        { userId, projectId }
      );

      if (!result.records[0]) {
        return null;
      }

      const record = result.records[0];
      return {
        id: String(record.get('id')),
        title: String(record.get('title') ?? ''),
        description: String(record.get('description') ?? ''),
        summary: String(record.get('summary') ?? ''),
        createdAt: record.get('createdAt') ? String(record.get('createdAt')) : null,
        members: this.mapMembers(record.get('members')),
        roles: this.mapRoles(record.get('roles'))
      };
    } finally {
      await session.close();
    }
  }

  public async findMissingUserIds(userIds: string[]): Promise<string[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario)
         WHERE u.userId IN $userIds
         RETURN collect(u.userId) AS existingIds`,
        { userIds }
      );
      const existingIds = new Set((result.records[0]?.get('existingIds') as string[] | undefined) ?? []);
      return userIds.filter((userId) => !existingIds.has(userId));
    } finally {
      await session.close();
    }
  }

  public async findActiveAssignedTasks(projectId: string, userIds: string[]): Promise<ActiveTaskSummary[]> {
    if (userIds.length === 0) {
      return [];
    }

    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto {projectId: $projectId})
         MATCH (member:Usuario)-[:ASIGNADO_A]->(task:Tarea)
         WHERE member.userId IN $userIds
           AND (
             EXISTS { MATCH (project)-[:CONTIENE]->(task) }
             OR EXISTS { MATCH (project)-[:TIENE_TAREA]->(task) }
           )
           AND NOT toLower(coalesce(task.status, task.estado, 'active')) IN $inactiveTaskStatuses
         RETURN coalesce(task.taskId, task.tareaId, task.id, elementId(task)) AS taskId,
                coalesce(task.title, task.titulo, task.name, task.nombre, '') AS title,
                coalesce(task.status, task.estado) AS status,
                member.userId AS assigneeId
         ORDER BY assigneeId, coalesce(task.updatedAt, task.createdAt, '') DESC`,
        { projectId, userIds, inactiveTaskStatuses: INACTIVE_TASK_STATUSES }
      );

      return result.records.map((record) => ({
        taskId: String(record.get('taskId')),
        title: String(record.get('title') ?? ''),
        status: record.get('status') ? String(record.get('status')) : null,
        assigneeId: String(record.get('assigneeId'))
      }));
    } finally {
      await session.close();
    }
  }

  public async findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario)-[membership:PERTENECE_A]->(:Proyecto {projectId: $projectId})
         WHERE u.userId IN $userIds
         RETURN u.userId AS userId, membership.rol AS rol`,
        { projectId, userIds }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        rol: String(record.get('rol') ?? '')
      }));
    } finally {
      await session.close();
    }
  }

  public async addMembers(projectId: string, members: TeamMemberInput[]): Promise<string[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `UNWIND $members AS member
         MATCH (user:Usuario {userId: member.userId}), (project:Proyecto {projectId: $projectId})
         MERGE (user)-[membership:PERTENECE_A]->(project)
         SET membership.rol = member.rol
         RETURN collect(DISTINCT user.userId) AS addedIds`,
        { projectId, members }
      );
      return ((result.records[0]?.get('addedIds') as string[] | undefined) ?? []).map(String);
    } finally {
      await session.close();
    }
  }

  public async removeMembers(projectId: string, userIds: string[]): Promise<string[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (user:Usuario)-[membership:PERTENECE_A]->(:Proyecto {projectId: $projectId})
         WHERE user.userId IN $userIds
         DELETE membership
         RETURN collect(DISTINCT user.userId) AS removedIds`,
        { projectId, userIds }
      );
      return ((result.records[0]?.get('removedIds') as string[] | undefined) ?? []).map(String);
    } finally {
      await session.close();
    }
  }

  private mapMembers(value: unknown): TeamComposition['members'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        userId: String(item.userId ?? ''),
        user: String(item.user ?? ''),
        rol: String(item.rol ?? 'miembro'),
        joinedAt: item.joinedAt ? String(item.joinedAt) : null
      }))
      .filter((member) => member.userId);
  }

  private mapRoles(value: unknown): TeamComposition['roles'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        roleId: String(item.roleId ?? ''),
        name: String(item.name ?? ''),
        skills: Array.isArray(item.skills)
          ? item.skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
          : []
      }))
      .filter((role) => role.name);
  }
}
