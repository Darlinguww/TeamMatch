// FASE 1: filtrado estructural (SCRUM-171) — esquema canónico: projectId, name
// Versión ampliada: neo4j/queries/09_scrum167_matchmaking.cypher

MATCH (p:Proyecto { projectId: $projectId })-[:TIENE_ROL]->(:Rol)-[r:REQUIERE]->(h:Habilidad)
MATCH (u:Usuario)-[th:TIENE_HABILIDAD]->(h)
MATCH (u)-[:TIENE_DISPONIBILIDAD]->(d:Disponibilidad)
WHERE NOT EXISTS { MATCH (u)-[:PERTENECE_A]->(p) }
  AND (th.nivel IN ['avanzado', 'intermedio', 'Avanzado', 'Intermedio'] OR $permitirBasico = true)
  AND d.horario IN $disponibilidadesRequeridas
  AND ($validarAniosExperiencia = false OR th.anios_experiencia >= coalesce(r.años_experiencia, 0))

WITH u,
  collect(DISTINCT {
    habilidad: h.name,
    nivel_usuario: th.nivel,
    anios_experiencia: th.anios_experiencia,
    prioridad_proyecto: r.prioridad,
    anios_requeridos: r.años_experiencia
  }) AS habilidades_coincidentes,
  collect(DISTINCT d.horario) AS modalidades_disponibles

RETURN
  u.email AS email,
  u.name AS nombre,
  habilidades_coincidentes,
  modalidades_disponibles
ORDER BY size(habilidades_coincidentes) DESC;
