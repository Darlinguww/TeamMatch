/**
 * Cypher canónico para membresía en proyectos (SCRUM-167).
 * Esquema: Proyecto.projectId, Usuario.userId.
 */
export const MERGE_PROJECT_MEMBERSHIP = `
MATCH (user:Usuario {userId: $userId})
MATCH (project:Proyecto {projectId: $projectId})
MERGE (user)-[membership:PERTENECE_A]->(project)
ON CREATE SET
  membership.rol = $rol,
  membership.fechaAsignacion = datetime()
ON MATCH SET
  membership.rol = $rol,
  membership.actualizadoEn = datetime()
RETURN
  user.userId AS userId,
  project.projectId AS projectId,
  membership.rol AS rol,
  toString(membership.fechaAsignacion) AS fechaAsignacion
`;

export const MERGE_PROJECT_MEMBERSHIPS_BATCH = `
UNWIND $members AS member
MATCH (user:Usuario {userId: member.userId})
MATCH (project:Proyecto {projectId: $projectId})
MERGE (user)-[membership:PERTENECE_A]->(project)
ON CREATE SET
  membership.rol = member.rol,
  membership.fechaAsignacion = datetime()
ON MATCH SET
  membership.rol = member.rol,
  membership.actualizadoEn = datetime()
RETURN collect(DISTINCT user.userId) AS addedIds
`;
