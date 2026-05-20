// SCRUM-223 — Co-evaluación (esquema canónico: projectId)
CREATE CONSTRAINT evaluacion_unica_idx IF NOT EXISTS
FOR ()-[r:EVALUO]-()
REQUIRE (r.evaluadorId, r.evaluadoId, r.projectId) IS UNIQUE;

MATCH (evaluador:Usuario { email: $emailEvaluador })
MATCH (evaluado:Usuario { email: $emailEvaluado })
MATCH (evaluador)-[:PERTENECE_A]->(p:Proyecto { projectId: $projectId })<-[:PERTENECE_A]-(evaluado)

MERGE (evaluador)-[e:EVALUO]->(evaluado)
ON CREATE SET
  e.projectId = p.projectId,
  e.evaluadorId = evaluador.userId,
  e.evaluadoId = evaluado.userId,
  e.nota_comunicacion = toFloat($notaCom),
  e.nota_responsabilidad = toFloat($notaResp),
  e.nota_tecnica = toFloat($notaTec),
  e.comentario = $comentario

RETURN evaluador.name AS de, evaluado.name AS para, e.comentario AS feedback;
