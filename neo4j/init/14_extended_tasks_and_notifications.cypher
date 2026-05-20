// Tareas y notificaciones semilla para probar el tablero Kanban y los flujos de revision.

WITH [
  {projectId: 'p4', tasks: [
    {taskId: 'p4-t1', title: 'Diseñar mapa de cursos', description: 'Definir estructura de cursos, modulos y rutas de aprendizaje.', status: 'pendiente', sprint: 1, assignedUserId: '9'},
    {taskId: 'p4-t2', title: 'API de progreso del estudiante', description: 'Implementar endpoints para avance, lecciones completadas y certificados.', status: 'en progreso', sprint: 1, assignedUserId: '6'},
    {taskId: 'p4-t3', title: 'Prototipo de aula virtual', description: 'Crear pantallas principales en Figma y validar flujo con usuarios.', status: 'en revision', sprint: 1, assignedUserId: '5'},
    {taskId: 'p4-t4', title: 'Carga inicial de contenidos', description: 'Preparar seed de cursos demo y recursos multimedia.', status: 'completada', sprint: 2, assignedUserId: '7'}
  ]},
  {projectId: 'p5', tasks: [
    {taskId: 'p5-t1', title: 'Modelo de contactos y oportunidades', description: 'Diseñar entidades principales del CRM y relaciones.', status: 'pendiente', sprint: 1, assignedUserId: '18'},
    {taskId: 'p5-t2', title: 'Pipeline comercial Kanban', description: 'Crear tablero de oportunidades con fases configurables.', status: 'en progreso', sprint: 1, assignedUserId: '10'},
    {taskId: 'p5-t3', title: 'Suite de pruebas de regresion', description: 'Automatizar pruebas de creacion, edicion y cierre de oportunidades.', status: 'en revision', sprint: 2, assignedUserId: '13'}
  ]},
  {projectId: 'p6', tasks: [
    {taskId: 'p6-t1', title: 'Registro de rutinas', description: 'Pantalla movil para registrar ejercicios y repeticiones.', status: 'en progreso', sprint: 1, assignedUserId: '14'},
    {taskId: 'p6-t2', title: 'Servicio de metas semanales', description: 'Calcular objetivos segun historial y preferencias.', status: 'pendiente', sprint: 1, assignedUserId: '10'},
    {taskId: 'p6-t3', title: 'Plan de lanzamiento beta', description: 'Definir cohortes, metricas y comunicacion del piloto.', status: 'completada', sprint: 2, assignedUserId: '11'}
  ]},
  {projectId: 'p7', tasks: [
    {taskId: 'p7-t1', title: 'Dashboard de indicadores', description: 'Construir vistas de metricas clave con filtros por periodo.', status: 'en revision', sprint: 1, assignedUserId: '18'},
    {taskId: 'p7-t2', title: 'Pipeline ETL inicial', description: 'Ingestar fuentes CSV y normalizar columnas criticas.', status: 'en progreso', sprint: 1, assignedUserId: '7'},
    {taskId: 'p7-t3', title: 'Despliegue en Kubernetes', description: 'Configurar manifests, secrets y health checks.', status: 'pendiente', sprint: 2, assignedUserId: '8'}
  ]},
  {projectId: 'p8', tasks: [
    {taskId: 'p8-t1', title: 'Revision de amenazas', description: 'Identificar riesgos para pagos, tokens y datos sensibles.', status: 'completada', sprint: 1, assignedUserId: '12'},
    {taskId: 'p8-t2', title: 'Servicio de autorizacion', description: 'Implementar reglas de aprobacion y validacion de operaciones.', status: 'en progreso', sprint: 1, assignedUserId: '6'},
    {taskId: 'p8-t3', title: 'Pruebas de seguridad basicas', description: 'Cubrir validaciones de autenticacion, permisos y entradas invalidas.', status: 'en revision', sprint: 2, assignedUserId: '13'}
  ]}
] AS projects
UNWIND projects AS projectInput
MATCH (project:Proyecto {projectId: projectInput.projectId})
UNWIND projectInput.tasks AS taskInput
MERGE (task:Tarea {taskId: taskInput.taskId})
SET task.tareaId = taskInput.taskId,
    task.title = taskInput.title,
    task.titulo = taskInput.title,
    task.description = taskInput.description,
    task.descripcion = taskInput.description,
    task.status = taskInput.status,
    task.estado = taskInput.status,
    task.sprint = taskInput.sprint,
    task.createdAt = coalesce(task.createdAt, datetime() - duration({days: taskInput.sprint + 2})),
    task.updatedAt = datetime()
MERGE (project)-[:CONTIENE]->(task)
WITH task, taskInput
MATCH (assigned:Usuario {userId: taskInput.assignedUserId})
MERGE (assigned)-[:ASIGNADO_A]->(task);

// Notificaciones iniciales para comprobar el centro de alertas desde el primer arranque.
WITH [
  {notificationId: 'n-p4-review', recipientId: '5', taskId: 'p4-t3', type: 'TASK_IN_REVIEW', message: 'Una tarea fue enviada a revision'},
  {notificationId: 'n-p5-review', recipientId: '6', taskId: 'p5-t3', type: 'TASK_IN_REVIEW', message: 'Una tarea fue enviada a revision'},
  {notificationId: 'n-p7-review', recipientId: '7', taskId: 'p7-t1', type: 'TASK_IN_REVIEW', message: 'Una tarea fue enviada a revision'},
  {notificationId: 'n-p8-review', recipientId: '12', taskId: 'p8-t3', type: 'TASK_IN_REVIEW', message: 'Una tarea fue enviada a revision'}
] AS notifications
UNWIND notifications AS notificationInput
MATCH (recipient:Usuario {userId: notificationInput.recipientId})
MATCH (task:Tarea {taskId: notificationInput.taskId})
MATCH (project:Proyecto)-[:CONTIENE]->(task)
MERGE (notification:Notificacion {notificationId: notificationInput.notificationId})
SET notification.type = notificationInput.type,
    notification.message = notificationInput.message,
    notification.read = false,
    notification.taskId = task.taskId,
    notification.projectId = project.projectId,
    notification.createdAt = coalesce(notification.createdAt, datetime())
MERGE (recipient)-[:RECIBE]->(notification)
MERGE (notification)-[:SOBRE_TAREA]->(task);
