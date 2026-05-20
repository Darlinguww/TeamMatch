// =======================================================================
// Normalización de propiedades legacy → esquema canónico (TeamMatch)
// Ejecutar una vez en bases existentes, antes del pipeline M3.
//
// Canónico:
//   Proyecto.projectId, Proyecto.title, Proyecto.description
//   Usuario.userId, Usuario.name, Usuario.email
//   Habilidad.name, Habilidad.normalizedName, Habilidad.category
//   Tarea.taskId, Tarea.title, Tarea.description
// =======================================================================

// --- Proyecto ---
MATCH (p:Proyecto)
WHERE p.proyectoId IS NOT NULL AND p.projectId IS NULL
SET p.projectId = p.proyectoId;

MATCH (p:Proyecto)
WHERE p.nombre IS NOT NULL AND p.title IS NULL
SET p.title = p.nombre;

MATCH (p:Proyecto)
WHERE p.descripcion IS NOT NULL AND p.description IS NULL
SET p.description = p.descripcion;

// --- Usuario ---
MATCH (u:Usuario)
WHERE u.nombre IS NOT NULL AND u.name IS NULL
SET u.name = u.nombre;

// --- Habilidad ---
MATCH (h:Habilidad)
WHERE h.nombre IS NOT NULL AND h.name IS NULL
SET
  h.name = h.nombre,
  h.normalizedName = coalesce(h.normalizedName, h.nombreNormalizado, toLower(h.nombre));

MATCH (h:Habilidad)
WHERE h.category IS NULL AND h.es_tecnica IS NOT NULL
SET h.category = CASE WHEN h.es_tecnica THEN 'tecnica' ELSE 'blanda' END;

// --- Tarea ---
MATCH (t:Tarea)
WHERE t.tareaId IS NOT NULL AND t.taskId IS NULL
SET t.taskId = t.tareaId;

MATCH (t:Tarea)
WHERE t.titulo IS NOT NULL AND t.title IS NULL
SET t.title = t.titulo;

MATCH (t:Tarea)
WHERE t.descripcion IS NOT NULL AND t.description IS NULL
SET t.description = t.descripcion;

// --- Disponibilidad (horario legacy) ---
MATCH (d:Disponibilidad)
WHERE d.tipo_disponibilidad IS NOT NULL AND d.horario IS NULL
SET d.horario = d.tipo_disponibilidad;

// --- Relaciones EVALUO / PERTENECE_A ---
MATCH ()-[e:EVALUO]->()
WHERE e.proyectoId IS NOT NULL AND e.projectId IS NULL
SET e.projectId = e.proyectoId;

MATCH ()-[m:PERTENECE_A]->()
WHERE m.fecha_asignacion IS NOT NULL AND m.fechaAsignacion IS NULL
SET m.fechaAsignacion = datetime(m.fecha_asignacion);
