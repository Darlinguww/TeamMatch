// Cargar catálogo inicial de habilidades (SCRUM-143) - Atributos oficiales: nombre, es_tecnica
UNWIND [
  {nombre: 'Python', es_tecnica: true},
  {nombre: 'JavaScript', es_tecnica: true},
  {nombre: 'TypeScript', es_tecnica: true},
  {nombre: 'Node.js', es_tecnica: true},
  {nombre: 'React', es_tecnica: true},
  {nombre: 'Neo4j', es_tecnica: true},
  {nombre: 'Git', es_tecnica: true},
  {nombre: 'Liderazgo', es_tecnica: false},
  {nombre: 'Resolución de conflictos', es_tecnica: false},
  {nombre: 'Metodologías Ágiles', es_tecnica: false},
  {nombre: 'Gestión de Proyectos', es_tecnica: false},
  {nombre: 'Análisis de Negocio', es_tecnica: false}
] AS hab
MERGE (s:Habilidad {nombre: hab.nombre})
ON CREATE SET s.es_tecnica = hab.es_tecnica;