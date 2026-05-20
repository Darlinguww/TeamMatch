// Índices base (esquema canónico)
CREATE INDEX habilidad_name_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.name);

CREATE INDEX habilidad_normalized_name_idx IF NOT EXISTS
FOR (h:Habilidad)
ON (h.normalizedName);
