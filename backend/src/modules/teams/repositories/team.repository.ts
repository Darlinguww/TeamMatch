import { driver } from '../../../database/neo4j.js';
import { TeamMemberInput, TeamRepository as TeamRepositoryContract } from '../team.service.js';

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
}
