// =======================================================================
// SCRUM-204: GESTIÓN OPERATIVA Y VALIDACIÓN DE SEGURIDAD (IDOR)
// Consultas parametrizadas para el Backend de TeamMatch
// =======================================================================

// -----------------------------------------------------------------------
// QUERIES DE CONTROL OPERATIVO
// -----------------------------------------------------------------------

// 1. Actualizar el estado de una tarea específica asignada a un usuario
// Parámetros: $tareaId, $emailUsuario, $nuevoEstado (ej: 'Para revisión', 'Completada')
MATCH (t:Tarea {tareaId: $tareaId})-[r:ASIGNADO_A]->(u:Usuario {email: $emailUsuario})
SET r.estado = $nuevoEstado
RETURN t.tareaId AS tarea, u.email AS asignado, r.estado AS estado_actualizado;


// -----------------------------------------------------------------------
// QUERIES DE PROTECCIÓN DE SEGURIDAD (PREVENCIÓN IDOR)
// -----------------------------------------------------------------------

// 2. Validar si el usuario operante es el LÍDER del proyecto que contiene la tarea
// Explicación: El backend ejecuta esto pasando el email de la sesión activa y la tarea que se intenta alterar.
// Si retorna 0 filas o false, la petición se rechaza inmediatamente por falta de permisos.
// Parámetros: $emailOperante, $tareaId
MATCH (u:Usuario {email: $emailOperante})-[r:PERTENECE_A]->(p:Proyecto)-[:CONTIENE]->(t:Tarea {tareaId: $tareaId})
WHERE r.rol = 'Líder'
RETURN count(t) > 0 AS es_autorizado, p.proyectoId AS proyecto_id;

// 3. Consulta de seguridad extendida para Miembros
// (Permite validar si un estudiante común tiene permiso de ver/editar la tarea porque está asignado a ella)
// Parámetros: $emailOperante, $tareaId
MATCH (t:Tarea {tareaId: $tareaId})-[:ASIGNADO_A]->(u:Usuario {email: $emailOperante})
RETURN count(t) > 0 AS es_asignado;