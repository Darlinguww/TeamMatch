// Unicidad de co-evaluación por proyecto (SCRUM-223)
CREATE CONSTRAINT evaluacion_unica_idx IF NOT EXISTS
FOR ()-[r:EVALUO]-()
REQUIRE (r.evaluadorId, r.evaluadoId, r.proyectoId) IS UNIQUE;
