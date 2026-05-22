// =========================================================================
// SCRIPT DE DATOS MAESTRO - REPOSITORIO DE MATCHMAKING & ESQUEMA CANÓNICO
// =========================================================================

// 1. CREACIÓN DE NODOS DE HABILIDAD (Categorías mapeadas con SKILL_CATEGORY_KEYWORDS)
UNWIND [
  {n: 'Neo4j', c: 'data'}, {n: 'TypeScript', c: 'frontend'}, {n: 'Docker', c: 'devops'}, {n: 'Python', c: 'data'},
  {n: 'React', c: 'frontend'}, {n: 'Figma', c: 'design'}, {n: 'Node.js', c: 'backend'}, {n: 'PostgreSQL', c: 'data'},
  {n: 'Diagnóstico Médico', c: 'social-work'}, {n: 'Primeros Auxilios', c: 'social-work'}, {n: 'Sutura', c: 'social-work'}, {n: 'Farmacología', c: 'social-work'},
  {n: 'Anatomía Clínica', c: 'social-work'}, {n: 'Leadership', c: 'management'}, {n: 'Communication', c: 'humanities'}, {n: 'Testing', c: 'qa'}
] AS skill
MERGE (h:Habilidad {name: skill.n})
SET h.normalizedName = toLower(skill.n), h.category = skill.c;

// 2. CREACIÓN DE DISPONIBILIDADES (Mapeando días en inglés según exige tu parámetro $weekdays)
UNWIND [
  {d: 'monday', s: '08:00', e: '12:00'}, {d: 'tuesday', s: '14:00', e: '18:00'},
  {d: 'wednesday', s: '09:00', e: '13:00'}, {d: 'thursday', s: '15:00', e: '19:00'},
  {d: 'friday', s: '08:00', e: '16:00'}
] AS slot
CREATE (disp:Disponibilidad {day: slot.d, start: slot.s, end: slot.e});

// 3. CREACIÓN DE USUARIOS (Estructura de perfiles y nombres requeridos)
UNWIND [
  {id: 'U1', user: 'Daniel', em: 'daniel@uninorte.edu.co'},
  {id: 'U2', user: 'Jhosep', em: 'jhosep@uninorte.edu.co'},
  {id: 'U3', user: 'Iván', em: 'ivan@uninorte.edu.co'},
  {id: 'U4', user: 'Mateo Andrés', em: 'mateoa@uninorte.edu.co'},
  {id: 'U5', user: 'Carlos Mendoza', em: 'carlosm@uninorte.edu.co'},
  {id: 'U6', user: 'Dra. María Camila', em: 'mcamila@uninorte.edu.co'},
  {id: 'U7', user: 'Juan Sebastián', em: 'jsebastian@uninorte.edu.co'},
  {id: 'U8', user: 'Gabriela Gómez', em: 'ggomez@uninorte.edu.co'}
] AS data
MERGE (u:Usuario {userId: data.id})
SET u.user = data.user, u.email = data.em;

// Asignar horarios de manera aleatoria simple para testing de candidatos
MATCH (u:Usuario), (d:Disponibilidad)
WITH u, d WHERE rand() > 0.4
MERGE (u)-[:DISPONIBLE_EN]->(d);

// 4. ASIGNACIÓN DE RELACIONES DE EXPERIENCIA Y HABILIDADES DE PERFIL
// Daniel
MATCH (u:Usuario {userId: 'U1'}), (h1:Habilidad {name: 'Neo4j'}), (h2:Habilidad {name: 'TypeScript'}), (h3:Habilidad {name: 'Leadership'})
MERGE (u)-[r1:TIENE_EXPERIENCIA_EN]->(h1) SET r1.yearsOfExperience = 3.5, r1.level = 'Advanced'
MERGE (u)-[r2:TIENE_EXPERIENCIA_EN]->(h2) SET r2.yearsOfExperience = 2.0, r2.level = 'Intermediate'
MERGE (u)-[:TIENE_HABILIDAD]->(h1) MERGE (u)-[:TIENE_HABILIDAD]->(h2) MERGE (u)-[:TIENE_HABILIDAD]->(h3);

// Jhosep
MATCH (u:Usuario {userId: 'U2'}), (h1:Habilidad {name: 'TypeScript'}), (h2:Habilidad {name: 'Node.js'}), (h3:Habilidad {name: 'Docker'})
MERGE (u)-[r1:TIENE_EXPERIENCIA_EN]->(h1) SET r1.yearsOfExperience = 4.0, r1.level = 'Advanced'
MERGE (u)-[r2:TIENE_EXPERIENCIA_EN]->(h2) SET r2.yearsOfExperience = 3.0, r2.level = 'Advanced'
MERGE (u)-[:TIENE_HABILIDAD]->(h1) MERGE (u)-[:TIENE_HABILIDAD]->(h2) MERGE (u)-[:TIENE_HABILIDAD]->(h3);

// Iván
MATCH (u:Usuario {userId: 'U3'}), (h1:Habilidad {name: 'React'}), (h2:Habilidad {name: 'TypeScript'}), (h3:Habilidad {name: 'Figma'})
MERGE (u)-[r1:TIENE_EXPERIENCIA_EN]->(h1) SET r1.yearsOfExperience = 2.5, r1.level = 'Intermediate'
MERGE (u)-[:TIENE_HABILIDAD]->(h1) MERGE (u)-[:TIENE_HABILIDAD]->(h2) MERGE (u)-[:TIENE_HABILIDAD]->(h3);

// Mateo Andrés
MATCH (u:Usuario {userId: 'U4'}), (h1:Habilidad {name: 'Python'}), (h2:Habilidad {name: 'PostgreSQL'})
MERGE (u)-[r1:TIENE_EXPERIENCIA_EN]->(h1) SET r1.yearsOfExperience = 3.0, r1.level = 'Advanced'
MERGE (u)-[:TIENE_HABILIDAD]->(h1) MERGE (u)-[:TIENE_HABILIDAD]->(h2);

// Dra. María Camila (Perfil de Salud)
MATCH (u:Usuario {userId: 'U6'}), (h1:Habilidad {name: 'Diagnóstico Médico'}), (h2:Habilidad {name: 'Primeros Auxilios'}), (h3:Habilidad {name: 'Leadership'})
MERGE (u)-[r1:TIENE_EXPERIENCIA_EN]->(h1) SET r1.yearsOfExperience = 5.0, r1.level = 'Expert'
MERGE (u)-[:TIENE_HABILIDAD]->(h1) MERGE (u)-[:TIENE_HABILIDAD]->(h2) MERGE (u)-[:TIENE_HABILIDAD]->(h3);

// 5. SIMULACIÓN DE EVALUACIONES PARA REPUTATION SCORE
MATCH (evaluador:Usuario {userId: 'U5'}), (candidato:Usuario)
WHERE candidato.userId <> 'U5'
MERGE (evaluador)-[e:EVALUO]->(candidato)
SET e.puntaje = 4.5, e.projectId = 'P1';

// 6. CREACIÓN DE PROYECTOS Y SUS ROLES REQUERIDOS
// Proyecto 1: Desarrollo de Software
MERGE (p1:Proyecto {projectId: 'P1'})
SET p1.title = 'Algoritmo Optimizado de Matchmaking', p1.description = 'Ecosistema inteligente para la gestión de equipos basada en grafos de conocimiento.';

CREATE (r1:Rol {roleId: 'R1_P1', name: 'Lead Backend Developer'})
CREATE (r2:Rol {roleId: 'R2_P1', name: 'Frontend Engineer'})
WITH p1, r1, r2
MERGE (p1)-[:TIENE_ROL]->(r1)
MERGE (p1)-[:TIENE_ROL]->(r2)
WITH r1, r2
MATCH (h1:Habilidad {name: 'Neo4j'}), (h2:Habilidad {name: 'Node.js'}), (h3:Habilidad {name: 'React'}), (h4:Habilidad {name: 'TypeScript'})
MERGE (r1)-[:REQUIERE]->(h1) MERGE (r1)-[:REQUIERE]->(h2)
MERGE (r2)-[:REQUIERE]->(h3) MERGE (r2)-[:REQUIERE]->(h4);

// Proyecto 2: Brigada de Salud
MERGE (p2:Proyecto {projectId: 'P2'})
SET p2.title = 'Brigada de Asistencia Médica Rural', p2.description = 'Despliegue operativo y diagnóstico clínico en poblaciones vulnerables.';

CREATE (r3:Rol {roleId: 'R3_P2', name: 'Coordinador Médico'})
CREATE (r4:Rol {roleId: 'R4_P2', name: 'Asistente de Triaje'})
WITH p2, r3, r4
MERGE (p2)-[:TIENE_ROL]->(r3)
MERGE (p2)-[:TIENE_ROL]->(r4)
WITH r3, r4
MATCH (h1:Habilidad {name: 'Diagnóstico Médico'}), (h2:Habilidad {name: 'Leadership'}), (h3:Habilidad {name: 'Primeros Auxilios'})
MERGE (r3)-[:REQUIERE]->(h1) MERGE (r3)-[:REQUIERE]->(h2)
MERGE (r4)-[:REQUIERE]->(h3);

// 7. ASIGNAR MIEMBROS ACTUALES A LOS EQUIPOS (Para testear teamMembers)
MATCH (u1:Usuario {userId: 'U1'}), (p1:Proyecto {projectId: 'P1'})
MERGE (u1)-[:PERTENECE_A]->(p1);

MATCH (u2:Usuario {userId: 'U2'}), (p1:Proyecto {projectId: 'P1'})
MERGE (u2)-[:PERTENECE_A]->(p1);
