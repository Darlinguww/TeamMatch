import { driver } from '../../../database/neo4j.js';
import { TeamMemberInput, TeamRepository as TeamRepositoryContract } from '../team.service.js';

export class Neo4jTeamRepository implements TeamRepositoryContract {
  public async isProjectLeader(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[rel:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND coalesce(rel.rol, rel.role) = 'lider'
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
         RETURN u.userId AS userId, membership.rol AS rol`,
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
