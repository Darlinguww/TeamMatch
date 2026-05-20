// =======================================================================
// FASE 2 DEL PIPELINE: PROYECCIÓN Y ALGORITMOS DE SIMILITUD GDS (SCRUM-187)
// Desarrollado para calcular la afinidad entre Candidatos y Proyectos.
// =======================================================================

// TAREA A: Crear la proyección del grafo en memoria
CALL gds.graph.project(
  'matchmaking-pipeline',
  {
    Usuario: { label: 'Usuario' },
    Proyecto: { label: 'Proyecto' },
    Habilidad: { label: 'Habilidad' }
  },
  {
    TIENE_HABILIDAD: { type: 'TIENE_HABILIDAD', orientation: 'NATURAL' },
    REQUIERE: { type: 'REQUIERE', orientation: 'NATURAL' }
  }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;


// TAREA B: Similitud Jaccard nativa (Cypher)
// Mide coincidencia exacta de habilidades: interseccion / union
MATCH (p:Proyecto {projectId: $projectId})-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(hReq:Habilidad)
WITH p, collect(DISTINCT id(hReq)) AS proyectoSkillIds

MATCH (u:Usuario)-[:TIENE_HABILIDAD]->(hUser:Habilidad)
WITH p, proyectoSkillIds, u, collect(DISTINCT id(hUser)) AS usuarioSkillIds

WITH u, p,
     [x IN proyectoSkillIds WHERE x IN usuarioSkillIds] AS interseccion,
     [x IN proyectoSkillIds WHERE NOT x IN usuarioSkillIds] + [x IN usuarioSkillIds WHERE NOT x IN proyectoSkillIds] AS diferencia

WITH u, p, interseccion, diferencia,
     CASE 
       WHEN (size(interseccion) + size(diferencia)) = 0 THEN 0.0
       ELSE ROUND(toFloat(size(interseccion)) / (size(interseccion) + size(diferencia)), 3)
     END AS scoreJaccard

WHERE scoreJaccard > 0.1

RETURN u.name AS candidato, 
       u.email AS correo, 
       scoreJaccard AS score_compatibilidad,
       size(interseccion) AS habilidades_coincidentes
ORDER BY score_compatibilidad DESC
LIMIT 10;


// TAREA C: Similitud ponderada nativa (Cypher)
// Suma ponderada de coincidencias por nivel/prioridad
MATCH (p:Proyecto {projectId: $projectId})-[:TIENE_ROL]->(:Rol)-[r:REQUIERE]->(h:Habilidad)
WITH p, h, 
     CASE r.prioridad 
       WHEN 'alta' THEN 3.0 
       WHEN 'media' THEN 2.0 
       ELSE 1.0 
     END AS pesoRequisito
WITH p, collect({skill_id: id(h), peso: pesoRequisito}) AS requisitos,
     sum(CASE r.prioridad WHEN 'alta' THEN 3.0 WHEN 'media' THEN 2.0 ELSE 1.0 END) AS pesoTotal

MATCH (u:Usuario)
OPTIONAL MATCH (u)-[t:TIENE_HABILIDAD]->(hUser:Habilidad)
WITH u, requisitos, pesoTotal,
     collect(DISTINCT {
       skill_id: id(hUser),
       nivel: CASE t.nivel 
              WHEN 'Avanzado' THEN 3.0 
              WHEN 'Intermedio' THEN 2.0 
              WHEN 'Básico' THEN 1.0 
              ELSE 0.0 
            END
     }) AS usuarioSkills

WITH u, requisitos, pesoTotal, usuarioSkills,
     CASE 
       WHEN pesoTotal = 0 THEN 0.0
       ELSE ROUND(
         sum([
           req IN requisitos 
           WHERE ANY(us IN usuarioSkills WHERE us.skill_id = req.skill_id)
           | req.peso * (us.nivel / 3.0)
         ]) / pesoTotal,
         3
       )
     END AS scorePonderado

WHERE scorePonderado > 0.0

RETURN u.name AS candidato, 
       scorePonderado AS score_afin_ajustado
ORDER BY score_afin_ajustado DESC;