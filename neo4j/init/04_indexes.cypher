// Crear índices de búsqueda rápida (SCRUM-144)
CREATE INDEX habilidad_nombre_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.nombre);

CREATE INDEX habilidad_normalizado_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.nombreNormalizado);