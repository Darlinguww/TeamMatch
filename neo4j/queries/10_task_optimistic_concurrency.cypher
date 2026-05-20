// SCRUM-202 — Control de concurrencia optimista en Tarea
// Parámetros: $projectId, $taskId, $expectedStatus, $expectedVersion, $newStatus

MATCH (p:Proyecto { projectId: $projectId })-[:CONTIENE]->(t:Tarea { taskId: $taskId })
WHERE t.status = $expectedStatus
  AND coalesce(t.version, 0) = $expectedVersion
SET
  t.status = $newStatus,
  t.version = coalesce(t.version, 0) + 1,
  t.updatedAt = datetime()
RETURN t.taskId AS taskId, t.status AS status, t.version AS version;

// Sin filas → otro usuario actualizó primero (409 Conflict en el backend)
