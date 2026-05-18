// Cargar catálogo inicial de habilidades con categorías (SCRUM-143)
UNWIND [
  {name: 'Python', categoria: 'tecnica'},
  {name: 'JavaScript', categoria: 'tecnica'},
  {name: 'TypeScript', categoria: 'tecnica'},
  {name: 'Node.js', categoria: 'tecnica'},
  {name: 'React', categoria: 'tecnica'},
  {name: 'Neo4j', categoria: 'tecnica'},
  {name: 'Git', categoria: 'tecnica'},
  {name: 'Liderazgo', categoria: 'blanda'},
  {name: 'Resolución de conflictos', categoria: 'blanda'},
  {name: 'Metodologías Ágiles', categoria: 'blanda'},
  {name: 'Gestión de Proyectos', categoria: 'dominio'},
  {name: 'Análisis de Negocio', categoria: 'dominio'}
] AS hab
MERGE (s:Habilidad {name: hab.name})
ON CREATE SET s.categoria = hab.categoria, s.normalizedName = hab.name
ON MATCH SET s.categoria = hab.categoria;