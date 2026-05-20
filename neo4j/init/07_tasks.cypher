MERGE (t1:Tarea { taskId: 'tsk_001' })
ON CREATE SET
  t1.title = 'Diseñar Modelo de Datos en Neo4j',
  t1.description = 'Estructurar el catálogo de habilidades, usuarios y relaciones iniciales.',
  t1.prioridad = 'Alta';

MERGE (t2:Tarea { taskId: 'tsk_002' })
ON CREATE SET
  t2.title = 'Desarrollar Frontend del Tablero',
  t2.description = 'Crear los componentes de Figma en React para la vista del estudiante.',
  t2.prioridad = 'Media';

MATCH (p1:Proyecto { projectId: 'prj_001' })
MATCH (uDaniel:Usuario { email: 'daniel.cera@teammatch.com' })
MATCH (uAndrea:Usuario { email: 'andrea.ossa@teammatch.com' })
MATCH (t1:Tarea { taskId: 'tsk_001' })
MATCH (t2:Tarea { taskId: 'tsk_002' })

MERGE (p1)-[:CONTIENE]->(t1);
MERGE (p1)-[:CONTIENE]->(t2);

MERGE (t1)-[a1:ASIGNADO_A]->(uDaniel)
ON CREATE SET a1.fechaAsignacion = datetime('2026-05-10'), a1.estado = 'En proceso';

MERGE (t2)-[a2:ASIGNADO_A]->(uAndrea)
ON CREATE SET a2.fechaAsignacion = datetime('2026-05-15'), a2.estado = 'Para revisión';
