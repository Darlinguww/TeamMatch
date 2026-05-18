// Crear un usuario de prueba si no existe
MERGE (u:Usuario {email: 'daniel.dev@example.com'})
ON CREATE SET u.userId = 'usr_001', u.name = 'dan 123';

// Buscar al usuario y las habilidades para conectarlos con la relacion TIENE_HABILIDAD
MATCH (u:Usuario {email: 'd.dev@example.com'})
MATCH (h1:Habilidad {name: 'Python'})
MATCH (h2:Habilidad {name: 'Liderazgo'})

// Crear las relaciones con sus propiedades específicas
MERGE (u)-[r1:TIENE_HABILIDAD]->(h1)
ON CREATE SET r1.nivel = 'avanzado', r1.fuente = 'universidad', r1.anos_experiencia = 3

MERGE (u)-[r2:TIENE_HABILIDAD]->(h2)
ON CREATE SET r2.nivel = 'intermedio', r2.fuente = 'proyectos', r2.anos_experiencia = 1;