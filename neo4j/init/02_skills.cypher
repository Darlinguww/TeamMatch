// Catálogo de habilidades — esquema canónico: name, normalizedName, category
UNWIND [
  { name: 'Python', category: 'tecnica' },
  { name: 'JavaScript', category: 'tecnica' },
  { name: 'TypeScript', category: 'tecnica' },
  { name: 'Node.js', category: 'tecnica' },
  { name: 'Express', category: 'tecnica' },
  { name: 'React', category: 'tecnica' },
  { name: 'Vue', category: 'tecnica' },
  { name: 'Angular', category: 'tecnica' },
  { name: 'Neo4j', category: 'tecnica' },
  { name: 'Git', category: 'tecnica' },
  { name: 'Liderazgo', category: 'blanda' },
  { name: 'Resolución de conflictos', category: 'blanda' },
  { name: 'Metodologías Ágiles', category: 'blanda' },
  { name: 'Gestión de Proyectos', category: 'blanda' },
  { name: 'Análisis de Negocio', category: 'dominio' }
] AS hab
MERGE (s:Habilidad {name: hab.name})
ON CREATE SET
  s.normalizedName = toLower(hab.name),
  s.category = hab.category;

UNWIND [
  { h1: 'React', h2: 'Vue', peso: 0.85 },
  { h1: 'React', h2: 'Angular', peso: 0.75 },
  { h1: 'Vue', h2: 'Angular', peso: 0.80 },
  { h1: 'Node.js', h2: 'Express', peso: 0.90 },
  { h1: 'JavaScript', h2: 'TypeScript', peso: 0.85 },
  { h1: 'Gestión de Proyectos', h2: 'Metodologías Ágiles', peso: 0.80 },
  { h1: 'Liderazgo', h2: 'Resolución de conflictos', peso: 0.75 }
] AS relacion

MATCH (hab1:Habilidad { name: relacion.h1 })
MATCH (hab2:Habilidad { name: relacion.h2 })

MERGE (hab1)-[r1:SIMILAR_A]->(hab2)
ON CREATE SET r1.peso = relacion.peso;

MERGE (hab2)-[r2:SIMILAR_A]->(hab1)
ON CREATE SET r2.peso = relacion.peso;
