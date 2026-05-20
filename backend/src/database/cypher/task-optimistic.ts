/**
 * Actualización optimista de estado de tarea (SCRUM-202).
 * Falla si status/version no coinciden → conflicto de concurrencia.
 */
export const UPDATE_TASK_STATUS_OPTIMISTIC = `
MATCH (p:Proyecto { projectId: $projectId })-[:CONTIENE]->(t:Tarea { taskId: $taskId })
WHERE t.status = $expectedStatus
  AND coalesce(t.version, 0) = $expectedVersion
SET
  t.status = $newStatus,
  t.version = coalesce(t.version, 0) + 1,
  t.updatedAt = datetime()
WITH t, p
OPTIONAL MATCH (t)<-[:ASIGNADO_A]-(assigned:Usuario)
RETURN
  p.projectId AS projectId,
  t.taskId AS taskId,
  t.title AS title,
  t.description AS description,
  t.createdAt AS createdAt,
  t.status AS status,
  t.version AS version,
  assigned.userId AS assignedUserId,
  assigned.email AS assignedUserEmail
`;

export const GET_TASK_PROJECT_ID = `
MATCH (p:Proyecto)-[:CONTIENE]->(t:Tarea { taskId: $taskId })
RETURN p.projectId AS projectId
LIMIT 1
`;
