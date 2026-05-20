// Catálogo inicial de habilidades (SCRUM-128/143) y matriz SIMILAR_A (SCRUM-186)
UNWIND [
  {name: 'Python', es_tecnica: true},
  {name: 'JavaScript', es_tecnica: true},
  {name: 'TypeScript', es_tecnica: true},
  {name: 'Node.js', es_tecnica: true},
  {name: 'Express', es_tecnica: true},
  {name: 'React', es_tecnica: true},
  {name: 'Vue', es_tecnica: true},
  {name: 'Angular', es_tecnica: true},
  {name: 'Neo4j', es_tecnica: true},
  {name: 'Git', es_tecnica: true},
  {name: 'Liderazgo', es_tecnica: false},
  {name: 'Resolución de conflictos', es_tecnica: false},
  {name: 'Metodologías Ágiles', es_tecnica: false},
  {name: 'Gestión de Proyectos', es_tecnica: false},
  {name: 'Análisis de Negocio', es_tecnica: false},
  {name: 'Java', es_tecnica: true},
  {name: 'Ciberseguridad', es_tecnica: true},
  {name: 'Redes de computadoras', es_tecnica: true},
  {name: 'Contabilidad', es_tecnica: false},
  {name: 'Finanzas', es_tecnica: false},
  {name: 'Excel', es_tecnica: true},
  {name: 'SAP', es_tecnica: true},
  {name: 'Docker', es_tecnica: true},
  {name: 'Kubernetes', es_tecnica: true},
  {name: 'AWS', es_tecnica: true},
  {name: 'Figma', es_tecnica: true},
  {name: 'QA', es_tecnica: true},
  {name: 'Comunicación', es_tecnica: false},
  {name: 'Machine Learning', es_tecnica: true}
] AS hab
MERGE (s:Habilidad {name: hab.name})
ON CREATE SET s.es_tecnica = hab.es_tecnica, s.normalizedName = hab.name;

UNWIND [
  {h1: 'React', h2: 'Vue', peso: 0.85},
  {h1: 'React', h2: 'Angular', peso: 0.75},
  {h1: 'Vue', h2: 'Angular', peso: 0.80},
  {h1: 'Node.js', h2: 'Express', peso: 0.90},
  {h1: 'JavaScript', h2: 'TypeScript', peso: 0.85},
  {h1: 'Gestión de Proyectos', h2: 'Metodologías Ágiles', peso: 0.80},
  {h1: 'Liderazgo', h2: 'Resolución de conflictos', peso: 0.75}
] AS relacion
MATCH (hab1:Habilidad {name: relacion.h1})
MATCH (hab2:Habilidad {name: relacion.h2})
MERGE (hab1)-[r1:SIMILAR_A]->(hab2)
ON CREATE SET r1.peso = relacion.peso
MERGE (hab2)-[r2:SIMILAR_A]->(hab1)
ON CREATE SET r2.peso = relacion.peso;
