// =======================================================================
// GESTIÓN DE TAREAS Y FLUJO DE TRABAJO (SCRUM-203)
// Atributos oficiales y relaciones: :CONTIENE y :ASIGNADO_A
// =======================================================================

// 1. Crear nodos de Tarea de prueba
MERGE (t1:Tarea {tareaId: 'tsk_001'})
ON CREATE SET 
  t1.titulo = 'Diseñar Modelo de Datos en Neo4j',
  t1.descripcion = 'Estructurar el catálogo de habilidades, usuarios y relaciones iniciales.',
  t1.prioridad = 'Alta';

MERGE (t2:Tarea {tareaId: 'tsk_002'})
ON CREATE SET 
  t2.titulo = 'Desarrollar Frontend del Tablero',
  t2.descripcion = 'Crear los componentes de Figma en React para la vista del estudiante.',
  t2.prioridad = 'Media';


// 2. Buscar las entidades existentes (Proyectos y Usuarios creados previamente)
MATCH (p1:Proyecto {proyectoId: 'prj_001'})
MATCH (uDaniel:Usuario {email: 'daniel.cera@teammatch.com'})
MATCH (uAndrea:Usuario {email: 'andrea.ossa@teammatch.com'})

MATCH (t1:Tarea {tareaId: 'tsk_001'})
MATCH (t2:Tarea {tareaId: 'tsk_002'})


// 3. Crear relaciones [:CONTIENE] desde el Proyecto hacia las Tareas
MERGE (p1)-[:CONTIENE]->(t1);
MERGE (p1)-[:CONTIENE]->(t2);


// 4. Crear relaciones [:ASIGNADO_A] hacia los Usuarios con sus atributos de control
// Tarea 1 asignada a Daniel (Ya iniciada y en proceso)
MERGE (t1)-[a1:ASIGNADO_A]->(uDaniel)
ON CREATE SET 
  a1.fecha_asignacion = '2026-05-10',
  a1.estado = 'En proceso';

// Tarea 2 asignada a Andrea (Pendiente por revisión o inicio)
MERGE (t2)-[a2:ASIGNADO_A]->(uAndrea)
ON CREATE SET 
  a2.fecha_asignacion = '2026-05-15',
  a2.estado = 'Para revisión';