// SCRUM-188 — Jaccard con esquema canónico (projectId, name)
// Índices: neo4j/init/05_matchmaking_indexes.cypher

MATCH (p:Proyecto { projectId: $projectId })-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(hReq:Habilidad)
WITH p, collect(id(hReq)) AS proyectoSkills

MATCH (u:Usuario)-[:TIENE_HABILIDAD]->(hUser:Habilidad)
WHERE NOT EXISTS { MATCH (u)-[:PERTENECE_A]->(p) }
WITH p, proyectoSkills, u, collect(id(hUser)) AS usuarioSkills

WITH u, p, proyectoSkills, usuarioSkills,
     [x IN proyectoSkills WHERE x IN usuarioSkills] AS interseccion

WITH u, p, interseccion,
     CASE
       WHEN size(proyectoSkills) + size(usuarioSkills) - size(interseccion) = 0 THEN 0.0
       ELSE toFloat(size(interseccion)) / toFloat(size(proyectoSkills) + size(usuarioSkills) - size(interseccion))
     END AS scoreJaccard

WHERE scoreJaccard >= 0.35

RETURN u.name AS candidato,
       u.email AS correo,
       scoreJaccard AS score_compatibilidad,
       size(interseccion) AS habilidades_coincidentes
ORDER BY score_compatibilidad DESC
LIMIT $limiteCandidatos;
