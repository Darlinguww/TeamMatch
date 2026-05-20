// =======================================================================
// SCRUM-167 — Pipeline de matchmaking (esquema canónico)
// Propiedades: projectId, userId, name, title, description, taskId
// Migración legacy: neo4j/init/08_normalize_canonical_properties.cypher
// Índices: neo4j/init/05_matchmaking_indexes.cypher
// Backend: TeamRepository.assignMemberFromMatchmaking()
// =======================================================================

// ═══════════════════════════════════════════════════════════════════════
// TAREA 1 — Candidatos para matchmaking
// Parámetros: $projectId, $requeridoHabilidades, $limit (default 100)
// ═══════════════════════════════════════════════════════════════════════

// EXPLAIN
// PROFILE
MATCH (p:Proyecto {projectId: $projectId})
MATCH (u:Usuario)-[th:TIENE_HABILIDAD]->(h:Habilidad)
WHERE h.name IN $requeridoHabilidades
  AND NOT EXISTS {
    MATCH (u)-[:PERTENECE_A]->(p)
  }

WITH p, u,
     collect(DISTINCT {
       nombre: h.name,
       nivel: coalesce(th.nivel, th.level, 'intermedio'),
       categoria: coalesce(h.category, 'dominio')
     }) AS skills

OPTIONAL MATCH (u)-[:POSEE_EXPERIENCIA]->(e:Experiencia)
WITH p, u, skills,
     collect(DISTINCT { rol: e.rol, años: coalesce(e.años, e.anios, 0) }) AS experiences

OPTIONAL MATCH (u)-[:TIENE_DISPONIBILIDAD]->(d:Disponibilidad)
WITH p, u, skills, experiences, head(collect(d)) AS d

OPTIONAL MATCH (t:Tarea)-[evTarea:EVALUO]->(u)
WHERE coalesce(evTarea.projectId, t.projectId) = p.projectId
WITH p, u, skills, experiences, d,
     collect(DISTINCT {
       origen: 'tarea',
       taskId: t.taskId,
       puntaje: coalesce(evTarea.puntaje, evTarea.nota_tecnica),
       comentario: coalesce(evTarea.comentario, evTarea.feedback)
     }) AS feedbackTareas

OPTIONAL MATCH (evaluador:Usuario)-[evPar:EVALUO]->(u)
WHERE evPar.projectId = p.projectId
WITH u, skills, experiences, d, feedbackTareas,
     collect(DISTINCT {
       origen: 'coevaluacion',
       evaluadorId: evaluador.userId,
       puntaje: coalesce(
         evPar.puntaje,
         (coalesce(evPar.nota_tecnica, 0.0) + coalesce(evPar.nota_comunicacion, 0.0) + coalesce(evPar.nota_responsabilidad, 0.0)) / 3.0
       ),
       comentario: evPar.comentario
     }) AS feedbackPares

RETURN
  u.userId AS userId,
  u.name AS name,
  u.email AS email,
  skills,
  [x IN experiences WHERE x.rol IS NOT NULL] AS experiences,
  { horasPorSemana: d.horasPorSemana, horario: d.horario } AS disponibilidad,
  [f IN feedbackTareas + feedbackPares WHERE f.puntaje IS NOT NULL OR f.comentario IS NOT NULL] AS feedback
ORDER BY size(skills) DESC, u.name
LIMIT coalesce($limit, 100);


// ═══════════════════════════════════════════════════════════════════════
// TAREA 2 — Requerimientos del proyecto
// Parámetro: $projectId
// ═══════════════════════════════════════════════════════════════════════

MATCH (p:Proyecto {projectId: $projectId})
OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)-[req:REQUIERE]->(h:Habilidad)
WHERE h IS NOT NULL

WITH p, r,
     collect(DISTINCT { nombre: h.name, prioridad: coalesce(req.prioridad, 'medium') }) AS habilidades

WITH p,
     collect(DISTINCT {
       rol: coalesce(r.name, 'sin_rol'),
       habilidades: habilidades,
       prioridad: reduce(
         maxP = 'low',
         skill IN habilidades |
         CASE
           WHEN skill.prioridad IN ['high', 'alta'] THEN 'high'
           WHEN skill.prioridad IN ['medium', 'media'] AND maxP <> 'high' THEN 'medium'
           ELSE maxP
         END
       )
     }) AS requiredRoles

RETURN
  p.projectId AS projectId,
  p.title AS nombre,
  p.description AS descripcion,
  requiredRoles,
  size(requiredRoles) AS teamSize;


// ═══════════════════════════════════════════════════════════════════════
// TAREA 3 — Persistir asignación (implementado en backend)
// TeamRepository.assignMemberFromMatchmaking($userId, $projectId, $rol)
// ═══════════════════════════════════════════════════════════════════════
