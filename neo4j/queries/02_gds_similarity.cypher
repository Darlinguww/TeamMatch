// =======================================================================
// FASE 2 DEL PIPELINE: PROYECCIÓN Y ALGORITMOS DE SIMILITUD GDS (SCRUM-187)
// Desarrollado para calcular la afinidad entre Candidatos y Proyectos.
// =======================================================================

// TAREA A: Crear la proyección del grafo en memoria si no existe
// (Esto se ejecuta una vez en Neo4j para que la librería GDS pueda procesar los datos)
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
YIELD graphName, nodeCount, relationshipCount;


// TAREA B: Consulta parametrizada de Similitud de Jaccard
// (Mide la coincidencia exacta de los conjuntos de habilidades)
MATCH (p:Proyecto {proyectoId: $proyectoId})-[:REQUIERE]->(hReq:Habilidad)
WITH p, collect(id(hReq)) AS proyectoSkills

MATCH (u:Usuario)-[:TIENE_HABILIDAD]->(hUser:Habilidad)
WITH p, proyectoSkills, u, collect(id(hUser)) AS usuarioSkills

WITH u, p,
     [x IN proyectoSkills WHERE x IN usuarioSkills] AS interseccion,
     gds.util.vector.similarity.jaccard(proyectoSkills, usuarioSkills) AS scoreJaccard

WHERE scoreJaccard > 0.1 // Umbral para filtrar perfiles irrelevantes

RETURN u.nombre AS candidato, 
       u.email AS correo, 
       scoreJaccard AS score_compatibilidad,
       size(interseccion) AS habilidades_coincidentes
ORDER BY score_compatibilidad DESC
LIMIT 10;


// TAREA C: Consulta parametrizada de Similitud de Coseno
// (Pondera el nivel del usuario vs la prioridad requerida por el proyecto)
MATCH (p:Proyecto {proyectoId: $proyectoId})-[r:REQUIERE]->(h:Habilidad)
WITH p, h, case r.prioridad when 'alta' then 3.0 when 'media' then 2.0 else 1.0 end AS pesoReq
ORDER BY id(h)
WITH p, collect(pesoReq) AS vectorProyecto, collect(id(h)) AS habilidadesIds

MATCH (u:Usuario)
OPTIONAL MATCH (u)-[t:TIENE_HABILIDAD]->(hUser:Habilidad) WHERE id(hUser) IN habilidadesIds
WITH u, vectorProyecto, habilidadesIds,
     collect(case t.nivel when 'Avanzado' then 3.0 when 'Intermedio' then 2.0 when 'Básico' then 1.0 else 0.0 end) AS vectorUsuario

WITH u, gds.util.vector.similarity.cosine(vectorProyecto, vectorUsuario) AS scoreCoseno
WHERE scoreCoseno > 0.0

RETURN u.nombre AS candidato, scoreCoseno AS score_afin_ajustado
ORDER BY score_afin_ajustado DESC;