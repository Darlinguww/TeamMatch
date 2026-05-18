// Cargar catálogo inicial de habilidades con categorías oficiales (SCRUM-143/144)
UNWIND [
  {nombre: 'Python', categoria: 'técnica'},
  {nombre: 'JavaScript', categoria: 'técnica'},
  {nombre: 'TypeScript', categoria: 'técnica'},
  {nombre: 'Node.js', categoria: 'técnica'},
  {nombre: 'React', categoria: 'técnica'},
  {nombre: 'Neo4j', categoria: 'técnica'},
  {nombre: 'Git', categoria: 'técnica'},
  {nombre: 'Liderazgo', categoria: 'blanda'},
  {nombre: 'Resolución de conflictos', categoria: 'blanda'},
  {nombre: 'Metodologías Ágiles', categoria: 'blanda'},
  {nombre: 'Gestión de Proyectos', categoria: 'dominio'},
  {nombre: 'Análisis de Negocio', categoria: 'dominio'}
] AS hab
MERGE (s:Habilidad {nombre: hab.nombre})
ON CREATE SET s.categoria = hab.categoria, s.nombreNormalizado = hab.nombre
ON MATCH SET s.categoria = hab.categoria;