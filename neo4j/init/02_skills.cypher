// Cargar catálogo inicial de habilidades normalizadas (SCRUM-128)
UNWIND [
  {name: 'Python', es_tecnica: true},
  {name: 'JavaScript', es_tecnica: true},
  {name: 'TypeScript', es_tecnica: true},
  {name: 'Node.js', es_tecnica: true},
  {name: 'React', es_tecnica: true},
  {name: 'Neo4j', es_tecnica: true},
  {name: 'Git', es_tecnica: true},
  {name: 'Liderazgo', es_tecnica: false},
  {name: 'Resolución de conflictos', es_tecnica: false},
  {name: 'Metodologías Ágiles', es_tecnica: false}
] AS hab
MERGE (s:Habilidad {name: hab.name})
ON CREATE SET s.es_tecnica = hab.es_tecnica, s.normalizedName = hab.name;