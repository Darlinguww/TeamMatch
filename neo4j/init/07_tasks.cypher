// Tareas semilla con IDs, relaciones y estados compatibles con CRUD y workflow.

WITH [
  {taskId: 't1', projectId: 'p1', assignedUserId: '2', title: 'Configurar autenticacion movil', description: 'Implementar login, registro y persistencia segura de sesion.', status: 'en progreso', createdAt: '2026-05-10T10:00:00.000Z'},
  {taskId: 't2', projectId: 'p1', assignedUserId: '3', title: 'Prototipo de flujo de postulacion', description: 'Disenar pantallas clave y validar navegacion con usuarios.', status: 'pendiente', createdAt: '2026-05-11T10:00:00.000Z'},
  {taskId: 't3', projectId: 'p1', assignedUserId: '1', title: 'Revision de modelo de impacto', description: 'Cerrar criterios de medicion y reporte para organizaciones.', status: 'en revision', createdAt: '2026-05-12T10:00:00.000Z'},
  {taskId: 't4', projectId: 'p2', assignedUserId: '1', title: 'Modulo de permisos clinicos', description: 'Definir roles, autorizaciones y auditoria de accesos.', status: 'en progreso', createdAt: '2026-05-13T10:00:00.000Z'},
  {taskId: 't5', projectId: 'p3', assignedUserId: '4', title: 'Pipeline de prediccion academica', description: 'Preparar datos y baseline de alertas tempranas.', status: 'pendiente', createdAt: '2026-05-14T10:00:00.000Z'}
] AS tasks
UNWIND tasks AS item
MATCH (project:Proyecto {projectId: item.projectId})
MATCH (assigned:Usuario {userId: item.assignedUserId})
MERGE (task:Tarea {taskId: item.taskId})
SET task.tareaId = item.taskId,
    task.title = item.title,
    task.titulo = item.title,
    task.description = item.description,
    task.descripcion = item.description,
    task.status = item.status,
    task.estado = item.status,
    task.createdAt = item.createdAt
MERGE (project)-[:CONTIENE]->(task)
MERGE (project)-[:TIENE_TAREA]->(task)
MERGE (assigned)-[assignment:ASIGNADO_A]->(task)
SET assignment.fecha_asignacion = date(),
    assignment.estado = item.status;
