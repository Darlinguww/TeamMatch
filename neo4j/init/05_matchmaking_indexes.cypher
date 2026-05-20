// SCRUM-167 — Índices matchmaking (esquema canónico)
CREATE INDEX usuario_userid_idx IF NOT EXISTS
FOR (u:Usuario)
ON (u.userId);

CREATE INDEX usuario_email_idx IF NOT EXISTS
FOR (u:Usuario)
ON (u.email);

CREATE INDEX proyecto_projectid_idx IF NOT EXISTS
FOR (p:Proyecto)
ON (p.projectId);

CREATE INDEX habilidad_name_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.name);

CREATE INDEX habilidad_category_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.category);

CREATE FULLTEXT INDEX habilidad_name_fulltext IF NOT EXISTS
FOR (h:Habilidad)
ON EACH [h.name, h.normalizedName];

CREATE INDEX tiene_habilidad_nivel_idx IF NOT EXISTS
FOR ()-[r:TIENE_HABILIDAD]-()
ON (r.nivel);

CREATE INDEX pertenece_a_rol_idx IF NOT EXISTS
FOR ()-[r:PERTENECE_A]-()
ON (r.rol);

CREATE INDEX requiere_prioridad_idx IF NOT EXISTS
FOR ()-[r:REQUIERE]-()
ON (r.prioridad);

CREATE INDEX tarea_taskid_idx IF NOT EXISTS
FOR (t:Tarea)
ON (t.taskId);

CREATE INDEX evaluo_projectid_idx IF NOT EXISTS
FOR ()-[r:EVALUO]-()
ON (r.projectId);
