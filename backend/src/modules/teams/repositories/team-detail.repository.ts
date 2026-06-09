import { driver } from '../../../database/neo4j.js';
import { serializeActiveTaskSummary, serializeTeamComposition } from '../serializers/team.serializer.js';
import { ActiveTaskSummary, TeamComposition } from '../types/team.types.js';

interface RemoveMemberRepositoryResult {
  teamId: string;
  memberId: string;
  membershipExists: boolean;
  memberIsLeader: boolean;
  activeTasks: ActiveTaskSummary[];
}

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

export class TeamDetailRepository {
  public async isProjectMember(userId: string, teamId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(team:Proyecto)
         WHERE team.projectId = $teamId OR team.proyectoId = $teamId
         RETURN 1 AS found
         LIMIT 1`,
        { userId, teamId: teamId.trim() }
      );

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async isProjectLeader(userId: string, teamId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[membership:PERTENECE_A]->(team:Proyecto)
         WHERE (team.projectId = $teamId OR team.proyectoId = $teamId)
           AND (
             coalesce(membership.isLeader, false) = true
             OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN 1 AS found
         LIMIT 1`,
        { userId, teamId: teamId.trim() }
      );

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async findCompositionById(teamId: string): Promise<TeamComposition | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (team:Proyecto)
         WHERE team.projectId = $teamId OR team.proyectoId = $teamId
         CALL {
           WITH team
           OPTIONAL MATCH (member:Usuario)-[membership:PERTENECE_A]->(team)
           WITH member, membership
           ORDER BY toLower(coalesce(member.user, '')), member.userId
           RETURN [item IN collect(
             CASE
               WHEN member IS NULL THEN null
               ELSE {
                 userId: member.userId,
                 user: member.user,
                 joinedAt: coalesce(membership.joinedAt, membership.createdAt),
                 rol: coalesce(membership.rol, membership.role, 'miembro')
               }
             END
           ) WHERE item IS NOT NULL] AS members
         }
         CALL {
           WITH team
           OPTIONAL MATCH (team)-[:TIENE_ROL]->(role:Rol)
           OPTIONAL MATCH (role)-[:REQUIERE]->(skill:Habilidad)
           WITH role, [skillName IN collect(DISTINCT skill.name) WHERE skillName IS NOT NULL] AS skills
           ORDER BY toLower(coalesce(role.name, '')), role.roleId
           RETURN [item IN collect(
             CASE
               WHEN role IS NULL THEN null
               ELSE {
                 roleId: role.roleId,
                 name: role.name,
                 skills: skills,
                 headcount: coalesce(role.headcount, 1)
               }
             END
           ) WHERE item IS NOT NULL] AS roles
         }
         RETURN coalesce(team.projectId, team.proyectoId) AS id,
                team.title AS title,
                team.description AS description,
                team.summary AS summary,
                team.createdAt AS createdAt,
                members,
                roles
         LIMIT 1`,
        { teamId: teamId.trim() }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return serializeTeamComposition({
        id: record.get('id'),
        title: record.get('title'),
        description: record.get('description'),
        summary: record.get('summary'),
        createdAt: record.get('createdAt'),
        members: record.get('members'),
        roles: record.get('roles')
      });
    } finally {
      await session.close();
    }
  }

  public async removeMemberIfNoActiveTasks(teamId: string, memberId: string): Promise<RemoveMemberRepositoryResult | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (team:Proyecto)
         WHERE team.projectId = $teamId OR team.proyectoId = $teamId
         OPTIONAL MATCH (member:Usuario {userId: $memberId})-[membership:PERTENECE_A]->(team)
         WITH team, member, membership
         CALL {
           WITH team, member
           OPTIONAL MATCH (team)-[:TIENE_TAREA]->(task:Tarea)<-[:ASIGNADO_A]-(member)
           WITH task
           WHERE task IS NOT NULL
             AND NOT toLower(coalesce(task.status, task.estado, 'active')) IN $inactiveTaskStatuses
           WITH task
           ORDER BY coalesce(task.updatedAt, task.createdAt, '') DESC
           RETURN collect({
             taskId: coalesce(task.taskId, task.tareaId, task.id, elementId(task)),
             title: coalesce(task.title, task.titulo, task.name, task.nombre, ''),
             status: coalesce(task.status, task.estado)
           }) AS activeTasks
         }
         WITH team,
              member,
              membership,
              activeTasks,
              membership IS NOT NULL AS membershipExists,
              coalesce(membership.isLeader, false) = true
                OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder'] AS memberIsLeader
         FOREACH (_ IN CASE WHEN membershipExists AND NOT memberIsLeader AND size(activeTasks) = 0 THEN [1] ELSE [] END | DELETE membership)
         RETURN coalesce(team.projectId, team.proyectoId) AS teamId,
                member.userId AS memberId,
                membershipExists,
                memberIsLeader,
                activeTasks
         LIMIT 1`,
        { teamId: teamId.trim(), memberId, inactiveTaskStatuses: INACTIVE_TASK_STATUSES }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const rawActiveTasks = record.get('activeTasks');
      const activeTasks = Array.isArray(rawActiveTasks)
        ? rawActiveTasks
          .map((task: unknown) => serializeActiveTaskSummary(task))
          .filter((task): task is ActiveTaskSummary => task !== null)
        : [];

      return {
        teamId: String(record.get('teamId')),
        memberId: String(record.get('memberId') ?? memberId),
        membershipExists: record.get('membershipExists') === true,
        memberIsLeader: record.get('memberIsLeader') === true,
        activeTasks
      };
    } finally {
      await session.close();
    }
  }
}
