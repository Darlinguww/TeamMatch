// Datos de prueba: usuario, disponibilidad y habilidades (SCRUM-144)
MERGE (u:Usuario {email: 'daniel.dev@example.com'})
ON CREATE SET u.userId = 'usr_001', u.name = 'Daniel Moran';

MERGE (d1:Disponibilidad {tipo_disponibilidad: 'Mañanas'})
MERGE (d2:Disponibilidad {tipo_disponibilidad: 'Fin de semana'})

MERGE (u)-[rd1:TIENE_DISPONIBILIDAD]->(d1) ON CREATE SET rd1.prioridad_usuario = 1;
MERGE (u)-[rd2:TIENE_DISPONIBILIDAD]->(d2) ON CREATE SET rd2.prioridad_usuario = 2;

MATCH (h1:Habilidad {name: 'Python'})
MATCH (h2:Habilidad {name: 'Liderazgo'})

MERGE (u)-[r1:TIENE_HABILIDAD]->(h1)
ON CREATE SET r1.nivel = 'avanzado', r1.fuente = 'universidad', r1.anos_experiencia = 3;

MERGE (u)-[r2:TIENE_HABILIDAD]->(h2)
ON CREATE SET r2.nivel = 'intermedio', r2.fuente = 'proyectos', r2.anos_experiencia = 1;
