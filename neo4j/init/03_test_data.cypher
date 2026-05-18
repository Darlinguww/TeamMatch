// 1. Crear o actualizar el usuario de prueba (Atributos oficiales: nombre, email, password_hash)
MERGE (u:Usuario {email: 'daniel.dev@example.com'})
ON CREATE SET u.userId = 'usr_001', u.nombre = 'Daniel Moran', u.password_hash = '$2b$10$EjemploHashBcrypt';

// 2. Crear los nodos de disponibilidad (Atributo oficial: tipo_disponibilidad)
MERGE (d1:Disponibilidad {tipo_disponibilidad: 'Mañanas'})
MERGE (d2:Disponibilidad {tipo_disponibilidad: 'Fin de semana'})

// 3. Crear las relaciones de disponibilidad (Atributo oficial: prioridad_usuario)
MERGE (u)-[rd1:TIENE_DISPONIBILIDAD]->(d1) ON CREATE SET rd1.prioridad_usuario = 1;
MERGE (u)-[rd2:TIENE_DISPONIBILIDAD]->(d2) ON CREATE SET rd2.prioridad_usuario = 2;

// 4. Buscar las habilidades y conectarlas (Atributo oficial de relación: nivel)
MATCH (h1:Habilidad {nombre: 'Python'})
MATCH (h2:Habilidad {nombre: 'Liderazgo'})

MERGE (u)-[r1:TIENE_HABILIDAD]->(h1)
ON CREATE SET r1.nivel = 'Avanzado'; // Valores permitidos: Básico, Intermedio, Avanzado

MERGE (u)-[r2:TIENE_HABILIDAD]->(h2)
ON CREATE SET r2.nivel = 'Intermedio';