// =======================================================================
// CATÁLOGO INICIAL DE HABILIDADES Y MATRIZ DE SIMILITUD (SCRUM-143 / SCRUM-186)
// Atributos oficiales del PDF: nombre, es_tecnica
// =======================================================================

// 1. Cargar el catálogo base de habilidades
UNWIND [
  {nombre: 'Python', es_tecnica: true},
  {nombre: 'JavaScript', es_tecnica: true},
  {nombre: 'TypeScript', es_tecnica: true},
  {nombre: 'Node.js', es_tecnica: true},
  {nombre: 'Express', es_tecnica: true},
  {nombre: 'React', es_tecnica: true},
  {nombre: 'Vue', es_tecnica: true},
  {nombre: 'Angular', es_tecnica: true},
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

// 2. Crear relaciones bidireccionales [:SIMILAR_A {peso}] (SCRUM-186)
UNWIND [
  // Similitudes de Frameworks Frontend (React, Vue, Angular)
  {h1: 'React', h2: 'Vue', peso: 0.85},
  {h1: 'React', h2: 'Angular', peso: 0.75},
  {h1: 'Vue', h2: 'Angular', peso: 0.80},

  // Similitudes del ecosistema de Backend en JavaScript/TypeScript
  {h1: 'Node.js', h2: 'Express', peso: 0.90},
  {h1: 'JavaScript', h2: 'TypeScript', peso: 0.85},

  // Similitudes de habilidades blandas / gestión
  {h1: 'Gestión de Proyectos', h2: 'Metodologías Ágiles', peso: 0.80},
  {h1: 'Liderazgo', h2: 'Resolución de conflictos', peso: 0.75}
] AS relacion

MATCH (hab1:Habilidad {nombre: relacion.h1})
MATCH (hab2:Habilidad {nombre: relacion.h2})

// Creamos la relación de ida
MERGE (hab1)-[r1:SIMILAR_A]->(hab2)
ON CREATE SET r1.peso = relacion.peso

// Creamos la relación de vuelta para asegurar la bidireccionalidad en el grafo
MERGE (hab2)-[r2:SIMILAR_A]->(hab1)
ON CREATE SET r2.peso = relacion.peso;
