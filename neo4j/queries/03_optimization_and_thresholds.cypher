// =======================================================================
// SCRUM-188: OPTIMIZACIÓN DE NEO4J E IMPLEMENTACIÓN DE UMBRALES
// Ajustes de rendimiento para el Pipeline de Matchmaking de TeamMatch
// =======================================================================

// -----------------------------------------------------------------------
// TAREA A: Creación de Índices Avanzados para Consultas Estructurales y GDS
// -----------------------------------------------------------------------

// 1. Índice para búsqueda rápida de Proyectos por ID (Usado en el arranque del pipeline)
CREATE INDEX proyecto_id_idx IF NOT EXISTS
FOR (p:Proyecto)
ON (p.proyectoId);

// 2. Índice para la búsqueda y validación de credenciales/perfiles de Usuarios
CREATE INDEX usuario_email_idx IF NOT EXISTS
FOR (u:Usuario)
ON (u.email);

// 3. Índice de texto para evaluar la similitud semántica en las aristas del catálogo
CREATE INDEX relacion_similar_peso_idx IF NOT EXISTS
FOR ()-[r:SIMILAR_A]-()
ON (r.peso);


// -----------------------------------------------------------------------
// TAREA B: Query GDS de Jaccard Optimizada aplicando el Umbral Crítico (0.35)
// -----------------------------------------------------------------------
MATCH (p:Proyecto {proyectoId: $proyectoId})-[:REQUIERE]->(hReq:Habilidad)
WITH p, collect(id(hReq)) AS proyectoSkills

MATCH (u:Usuario)-[:TIENE_HABILIDAD]->(hUser:Habilidad)
WITH p, proyectoSkills, u, collect(id(hUser)) AS usuarioSkills

WITH u, p,
     [x IN proyectoSkills WHERE x IN usuarioSkills] AS interseccion,
     gds.util.vector.similarity.jaccard(proyectoSkills, usuarioSkills) AS scoreJaccard

// Aplicación del umbral mínimo definido en la documentación técnica (SCRUM-188)
WHERE scoreJaccard >= 0.35 

RETURN u.nombre AS candidato, 
       u.email AS correo, 
       scoreJaccard AS score_compatibilidad,
       size(interseccion) AS habilidades_coincidentes
ORDER BY score_compatibilidad DESC
LIMIT $limiteCandidatos;