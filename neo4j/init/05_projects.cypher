// 1. Crear nodos de Proyecto de prueba con los atributos oficiales del PDF (SCRUM-169)
MERGE (p1:Proyecto {proyectoId: 'prj_001'})
ON CREATE SET 
  p1.nombre = 'Desarrollo de App Móvil Bancaria',
  p1.descripcion = 'Creación de una plataforma financiera segura utilizando arquitecturas modernas.',
  p1.estado = 'Reclutamiento';

MERGE (p2:Proyecto {proyectoId: 'prj_002'})
ON CREATE SET 
  p2.nombre = 'Motor de Recomendación con IA',
  p2.descripcion = 'Implementación de un sistema de recomendación basado en grafos y LLMs.',
  p2.estado = 'Planificación';

// 2. Buscar los proyectos y las habilidades (usando la propiedad oficial 'nombre')
MATCH (p1:Proyecto {proyectoId: 'prj_001'})
MATCH (p2:Proyecto {proyectoId: 'prj_002'})
MATCH (h1:Habilidad {nombre: 'TypeScript'})
MATCH (h2:Habilidad {nombre: 'React'})
MATCH (h3:Habilidad {nombre: 'Python'})
MATCH (h4:Habilidad {nombre: 'Neo4j'})

// 3. Crear relaciones :REQUIERE con sus atributos oficiales: prioridad y años_experiencia
// Proyecto 1 requiere TypeScript y React
MERGE (p1)-[r1:REQUIERE]->(h1)
ON CREATE SET r1.prioridad = 'alta', r1.años_experiencia = 2;

MERGE (p1)-[r2:REQUIERE]->(h2)
ON CREATE SET r2.prioridad = 'media', r2.años_experiencia = 1;

// Proyecto 2 requiere Python y Neo4j
MERGE (p2)-[r3:REQUIERE]->(h3)
ON CREATE SET r3.prioridad = 'alta', r3.años_experiencia = 3;

MERGE (p2)-[r4:REQUIERE]->(h4)
ON CREATE SET r4.prioridad = 'alta', r4.años_experiencia = 2;