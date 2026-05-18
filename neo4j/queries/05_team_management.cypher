// =======================================================================
// SCRUM-205: GESTIÓN DE MIEMBROS DE EQUIPO (ALTAS Y BAJAS)
// Consultas parametrizadas seguras para el Backend de TeamMatch
// =======================================================================

// -----------------------------------------------------------------------
// 1. AGREGAR MIEMBRO A UN PROYECTO
// -----------------------------------------------------------------------
// Busca al usuario y al proyecto por sus identificadores únicos.
// Si ya pertenece al proyecto, no duplica la relación (gracias a MERGE).
// Parámetros: $emailUsuario, $proyectoId
MATCH (u:Usuario {email: $emailUsuario})
MATCH (p:Proyecto {proyectoId: $proyectoId})
MERGE (u)-[r:PERTENECE_A]->(p)
ON CREATE SET r.rol = 'Miembro'
RETURN u.email AS usuario, p.proyectoId AS proyecto, r.rol AS rol_asignado;


// -----------------------------------------------------------------------
// 2. REMOVER MIEMBRO DE UN PROYECTO (CON PROTECCIÓN DE LIDERAZGO)
// -----------------------------------------------------------------------
// Paso A: Buscamos la relación asegurándonos de que el rol NO sea 'Líder'
MATCH (u:Usuario {email: $emailUsuario})-[r:PERTENECE_A]->(p:Proyecto {proyectoId: $proyectoId})
WHERE r.rol <> 'Líder'

// Paso B: Limpieza colateral (Opcional pero recomendada): 
// Antes de echarlo del proyecto, desasignamos al usuario de las tareas de ESTE proyecto
OPTIONAL MATCH (p)-[:CONTIENE]->(t:Tarea)-[a:ASIGNADO_A]->(u)
DELETE a

// Paso C: Borramos finalmente su vinculación con el proyecto
DELETE r
RETURN u.email AS usuario_removido, p.proyectoId AS proyecto_afectado;