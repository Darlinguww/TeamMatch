// SCRUM-204 — Tareas y seguridad IDOR (esquema canónico: taskId, projectId)

MATCH (t:Tarea { taskId: $taskId })-[r:ASIGNADO_A]->(u:Usuario { email: $emailUsuario })
SET r.estado = $nuevoEstado
RETURN t.taskId AS tarea, u.email AS asignado, r.estado AS estado_actualizado;

MATCH (u:Usuario { email: $emailOperante })-[r:PERTENECE_A]->(p:Proyecto)-[:CONTIENE]->(t:Tarea { taskId: $taskId })
WHERE r.rol = 'lider'
RETURN count(t) > 0 AS es_autorizado, p.projectId AS proyecto_id;

MATCH (t:Tarea { taskId: $taskId })-[:ASIGNADO_A]->(u:Usuario { email: $emailOperante })
RETURN count(t) > 0 AS es_asignado;
