// SCRUM-202 — Versión optimista en tareas existentes
MATCH (t:Tarea)
WHERE t.version IS NULL
SET t.version = 1;
