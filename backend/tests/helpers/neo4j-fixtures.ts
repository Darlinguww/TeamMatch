import type { Session } from 'neo4j-driver';

export interface SeededProjectGraph {
  projectId: string;
  leaderId: string;
  memberId: string;
  taskId: string;
}

/** Grafo mínimo: proyecto, líder, miembro y tarea asignada (workflow / IDOR). */
export async function seedProjectTaskGraph(
  session: Session,
  prefix: string
): Promise<SeededProjectGraph> {
  const projectId = `${prefix}-project`;
  const leaderId = `${prefix}-leader`;
  const memberId = `${prefix}-member`;
  const taskId = `${prefix}-task`;
  const now = new Date().toISOString();

  await session.run(
    `MERGE (project:Proyecto {projectId: $projectId})
     ON CREATE SET project.title = 'QA Project', project.createdAt = $now
     MERGE (leader:Usuario {userId: $leaderId})
     ON CREATE SET leader.user = 'Leader', leader.email = $leaderEmail, leader.createdAt = $now
     MERGE (member:Usuario {userId: $memberId})
     ON CREATE SET member.user = 'Member', member.email = $memberEmail, member.createdAt = $now
     MERGE (leader)-[:PERTENECE_A {isLeader: true, role: 'leader', joinedAt: $now}]->(project)
     MERGE (member)-[:PERTENECE_A {role: 'member', joinedAt: $now}]->(project)
     MERGE (task:Tarea {taskId: $taskId})
     ON CREATE SET task.title = 'Integration task',
                   task.status = 'In Progress',
                   task.estado = 'In Progress',
                   task.createdAt = $now
     MERGE (project)-[:TIENE_TAREA]->(task)
     MERGE (member)-[:ASIGNADO_A {assignedAt: $now}]->(task)`,
    {
      projectId,
      leaderId,
      memberId,
      taskId,
      leaderEmail: `${leaderId}@test.local`,
      memberEmail: `${memberId}@test.local`,
      now
    }
  );

  return { projectId, leaderId, memberId, taskId };
}

export async function seedProjectMembersOnly(
  session: Session,
  prefix: string
): Promise<{ projectId: string; leaderId: string; memberId: string }> {
  const projectId = `${prefix}-team`;
  const leaderId = `${prefix}-leader`;
  const memberId = `${prefix}-member`;
  const now = new Date().toISOString();

  await session.run(
    `MERGE (project:Proyecto {projectId: $projectId})
     ON CREATE SET project.title = 'Team QA', project.createdAt = $now
     MERGE (leader:Usuario {userId: $leaderId})
     ON CREATE SET leader.user = 'Leader', leader.email = $leaderEmail, leader.createdAt = $now
     MERGE (member:Usuario {userId: $memberId})
     ON CREATE SET member.user = 'Member', member.email = $memberEmail, member.createdAt = $now
     MERGE (leader)-[:PERTENECE_A {isLeader: true, role: 'leader', joinedAt: $now}]->(project)
     MERGE (member)-[:PERTENECE_A {role: 'member', joinedAt: $now}]->(project)`,
    {
      projectId,
      leaderId,
      memberId,
      leaderEmail: `${leaderId}@test.local`,
      memberEmail: `${memberId}@test.local`,
      now
    }
  );

  return { projectId, leaderId, memberId };
}

export async function attachActiveTaskToMember(
  session: Session,
  projectId: string,
  memberId: string,
  taskId: string
): Promise<void> {
  const now = new Date().toISOString();

  await session.run(
    `MATCH (project:Proyecto {projectId: $projectId})
     MATCH (member:Usuario {userId: $memberId})
     MERGE (task:Tarea {taskId: $taskId})
     ON CREATE SET task.title = 'Active task',
                   task.status = 'In Progress',
                   task.estado = 'In Progress',
                   task.createdAt = $now
     MERGE (project)-[:TIENE_TAREA]->(task)
     MERGE (member)-[:ASIGNADO_A]->(task)`,
    { projectId, memberId, taskId, now }
  );
}

export async function cleanupUsersAndProjectsByPrefix(session: Session, prefix: string): Promise<void> {
  await session.run(
    `MATCH (u:Usuario)
     WHERE u.userId STARTS WITH $prefix
     DETACH DELETE u`,
    { prefix }
  );
  await session.run(
    `MATCH (p:Proyecto)
     WHERE p.projectId STARTS WITH $prefix
     DETACH DELETE p`,
    { prefix }
  );
}
