import { driver } from '../../../database/neo4j.js';
import { TeamMemberActiveTask, TeamMemberInput, TeamRepository as TeamRepositoryContract } from '../team.service.js';

export class Neo4jTeamRepository implements TeamRepositoryContract {
  public async isProjectLeader(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[rel:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND (
             coalesce(rel.isLeader, false) = true
             OR toLower(coalesce(rel.role, rel.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN 1 AS found
         LIMIT 1`,
        { userId, projectId: projectId.trim() }
      );
      return result.records.length > 0;
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

  public async listProjectMemberships(projectId: string): Promise<Array<{ userId: string; rol: string }>> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario)-[membership:PERTENECE_A]->(project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         RETURN u.userId AS userId,
                coalesce(membership.rol, membership.role, 'miembro') AS rol`,
        { projectId: projectId.trim() }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        rol: String(record.get('rol') ?? 'miembro')
      }));
    } finally {
      await session.close();
    }
  }

  public async getRoleVacancies(
    projectId: string
  ): Promise<Array<{ roleName: string; headcount: number; filled: number; available: number }>> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (p:Proyecto)-[:TIENE_ROL]->(role:Rol)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         OPTIONAL MATCH (member:Usuario)-[m:PERTENECE_A]->(p)
         WHERE toLower(coalesce(m.rol, m.role, '')) = toLower(role.name)
         RETURN role.name AS roleName,
                coalesce(role.headcount, 1) AS headcount,
                count(DISTINCT member) AS filled`,
        { projectId: projectId.trim() }
      );

      return result.records.map((record) => {
        const headcount = Number(record.get('headcount') ?? 1);
        const filled = Number(record.get('filled') ?? 0);
        const available = Math.max(0, headcount - filled);
        return {
          roleName: String(record.get('roleName')),
          headcount,
          filled,
          available
        };
      });
    } finally {
      await session.close();
    }
  }

  public async findProjectMemberships(projectId: string, userIds: string[]): Promise<Array<{ userId: string; rol: string }>> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario)-[membership:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND u.userId IN $userIds
         RETURN u.userId AS userId, coalesce(membership.rol, membership.role, '') AS rol`,
        { projectId: projectId.trim(), userIds }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        rol: String(record.get('rol') ?? '')
      }));
    } finally {
      await session.close();
    }
  }

  public async findActiveAssignedTasks(projectId: string, userIds: string[]): Promise<TeamMemberActiveTask[]> {
    if (userIds.length === 0) {
      return [];
    }

    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         MATCH (project)-[:TIENE_TAREA|CONTIENE]->(task:Tarea)<-[:ASIGNADO_A]-(assignee:Usuario)
         WHERE assignee.userId IN $userIds
           AND NOT toLower(coalesce(task.status, task.estado, 'active')) IN $inactiveTaskStatuses
         RETURN assignee.userId AS userId,
                coalesce(task.taskId, task.tareaId, task.id, elementId(task)) AS taskId,
                coalesce(task.title, task.titulo, task.name, task.nombre, '') AS title,
                coalesce(task.status, task.estado, '') AS status
         ORDER BY userId, title, taskId`,
        {
          projectId: projectId.trim(),
          userIds,
          inactiveTaskStatuses: [
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
          ]
        }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        taskId: String(record.get('taskId')),
        title: String(record.get('title') ?? ''),
        status: String(record.get('status') ?? '')
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
         MATCH (user:Usuario {userId: member.userId}), (project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         MERGE (user)-[membership:PERTENECE_A]->(project)
         SET membership.rol = member.rol,
             membership.role = member.rol
         RETURN collect(DISTINCT user.userId) AS addedIds`,
        { projectId: projectId.trim(), members }
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
        `MATCH (user:Usuario)-[membership:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND user.userId IN $userIds
         DELETE membership
         RETURN collect(DISTINCT user.userId) AS removedIds`,
        { projectId: projectId.trim(), userIds }
      );
      return ((result.records[0]?.get('removedIds') as string[] | undefined) ?? []).map(String);
    } finally {
      await session.close();
    }
  }
}
