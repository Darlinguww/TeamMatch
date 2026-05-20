// Candidatos diversos para demostrar matchmaking (redes, seguridad, finanzas, QA, datos, etc.)
// Password de prueba (misma que usuarios seed): Password1

WITH [
  {userId: '5', email: 'lucia.vega@example.com', name: 'Lucia Vega', skills: [
    {skill: 'Ciberseguridad', years: 6, level: 'expert'},
    {skill: 'Redes de computadoras', years: 5, level: 'advanced'},
    {skill: 'Firewall', years: 4, level: 'advanced'},
    {skill: 'Pentesting', years: 3, level: 'intermediate'}
  ], availability: [
    {day: 'monday', start: '08:00', end: '12:00'},
    {day: 'thursday', start: '14:00', end: '18:00'}
  ]},
  {userId: '6', email: 'miguel.torres@example.com', name: 'Miguel Torres', skills: [
    {skill: 'Contabilidad', years: 8, level: 'expert'},
    {skill: 'Finanzas', years: 7, level: 'advanced'},
    {skill: 'Excel', years: 10, level: 'expert'},
    {skill: 'SAP', years: 4, level: 'intermediate'}
  ], availability: [
    {day: 'tuesday', start: '09:00', end: '13:00'},
    {day: 'friday', start: '09:00', end: '12:00'}
  ]},
  {userId: '7', email: 'sofia.ramirez@example.com', name: 'Sofia Ramirez', skills: [
    {skill: 'Docker', years: 4, level: 'advanced'},
    {skill: 'Docker', years: 5, level: 'advanced'},
    {skill: 'Kubernetes', years: 3, level: 'intermediate'},
    {skill: 'AWS', years: 4, level: 'advanced'},
    {skill: 'CI/CD', years: 3, level: 'intermediate'}
  ], availability: [
    {day: 'wednesday', start: '10:00', end: '14:00'},
    {day: 'saturday', start: '10:00', end: '14:00'}
  ]},
  {userId: '8', email: 'andres.molina@example.com', name: 'Andres Molina', skills: [
    {skill: 'QA', years: 5, level: 'advanced'},
    {skill: 'Selenium', years: 4, level: 'advanced'},
    {skill: 'Cypress', years: 2, level: 'intermediate'},
    {skill: 'Trabajo en equipo', years: 5, level: 'advanced'}
  ], availability: [
    {day: 'monday', start: '18:00', end: '21:00'},
    {day: 'wednesday', start: '18:00', end: '21:00'}
  ]},
  {userId: '9', email: 'valentina.cruz@example.com', name: 'Valentina Cruz', skills: [
    {skill: 'Product Management', years: 6, level: 'expert'},
    {skill: 'Scrum', years: 5, level: 'advanced'},
    {skill: 'Comunicación', years: 8, level: 'expert'},
    {skill: 'Análisis de negocio', years: 4, level: 'advanced'}
  ], availability: [
    {day: 'tuesday', start: '14:00', end: '18:00'},
    {day: 'thursday', start: '10:00', end: '14:00'}
  ]},
  {userId: '10', email: 'jorge.herrera@example.com', name: 'Jorge Herrera', skills: [
    {skill: 'Redes de computadoras', years: 7, level: 'expert'},
    {skill: 'Ciberseguridad', years: 4, level: 'advanced'},
    {skill: 'VPN', years: 5, level: 'advanced'},
    {skill: 'SOC', years: 3, level: 'intermediate'}
  ], availability: [
    {day: 'friday', start: '08:00', end: '16:00'}
  ]},
  {userId: '11', email: 'camila.rios@example.com', name: 'Camila Rios', skills: [
    {skill: 'Análisis de datos', years: 4, level: 'advanced'},
    {skill: 'Python', years: 5, level: 'advanced'},
    {skill: 'SQL', years: 4, level: 'advanced'},
    {skill: 'Power BI', years: 3, level: 'intermediate'}
  ], availability: [
    {day: 'monday', start: '14:00', end: '18:00'},
    {day: 'sunday', start: '09:00', end: '13:00'}
  ]},
  {userId: '12', email: 'felipe.soto@example.com', name: 'Felipe Soto', skills: [
    {skill: 'Marketing digital', years: 5, level: 'advanced'},
    {skill: 'SEO', years: 4, level: 'advanced'},
    {skill: 'CRM', years: 3, level: 'intermediate'},
    {skill: 'Creatividad', years: 6, level: 'expert'}
  ], availability: [
    {day: 'tuesday', start: '10:00', end: '14:00'},
    {day: 'thursday', start: '16:00', end: '20:00'}
  ]},
  {userId: '13', email: 'elena.paredes@example.com', name: 'Elena Paredes', skills: [
    {skill: 'Recursos Humanos', years: 9, level: 'expert'},
    {skill: 'Liderazgo', years: 7, level: 'expert'},
    {skill: 'Negociación', years: 6, level: 'advanced'},
    {skill: 'Comunicación', years: 10, level: 'expert'}
  ], availability: [
    {day: 'wednesday', start: '09:00', end: '12:00'},
    {day: 'friday', start: '14:00', end: '17:00'}
  ]},
  {userId: '14', email: 'ricardo.nunez@example.com', name: 'Ricardo Nuñez', skills: [
    {skill: 'Node.js', years: 6, level: 'advanced'},
    {skill: 'Java', years: 7, level: 'expert'},
    {skill: 'Spring Boot', years: 5, level: 'advanced'},
    {skill: 'PostgreSQL', years: 5, level: 'advanced'},
    {skill: 'Microservicios', years: 4, level: 'advanced'}
  ], availability: [
    {day: 'monday', start: '09:00', end: '17:00'},
    {day: 'tuesday', start: '09:00', end: '17:00'}
  ]}
] AS people
UNWIND people AS person
MERGE (u:Usuario {userId: person.userId})
SET u.email = person.email,
    u.user = person.name,
    u.name = person.name,
    u.passwordHash = coalesce(u.passwordHash, '$2a$10$AjK7Q1wuXw8VEDrJqOVsO./..iok/sgN61pdw/Mv/DKzy44ENh5M6'),
    u.updatedAt = datetime()
WITH u, person
UNWIND person.skills AS sk
MERGE (skill:Habilidad {normalizedName: toLower(sk.skill)})
ON CREATE SET skill.name = sk.skill, skill.createdAt = datetime()
SET skill.updatedAt = datetime()
MERGE (u)-[:TIENE_HABILIDAD]->(skill)
MERGE (u)-[exp:TIENE_EXPERIENCIA_EN]->(skill)
SET exp.yearsOfExperience = toFloat(sk.years),
    exp.level = sk.level,
    exp.updatedAt = datetime();

WITH [
  {userId: '5', availability: [{day: 'monday', start: '08:00', end: '12:00'}, {day: 'thursday', start: '14:00', end: '18:00'}]},
  {userId: '6', availability: [{day: 'tuesday', start: '09:00', end: '13:00'}, {day: 'friday', start: '09:00', end: '12:00'}]},
  {userId: '7', availability: [{day: 'wednesday', start: '10:00', end: '14:00'}, {day: 'saturday', start: '10:00', end: '14:00'}]},
  {userId: '8', availability: [{day: 'monday', start: '18:00', end: '21:00'}, {day: 'wednesday', start: '18:00', end: '21:00'}]},
  {userId: '9', availability: [{day: 'tuesday', start: '14:00', end: '18:00'}, {day: 'thursday', start: '10:00', end: '14:00'}]},
  {userId: '10', availability: [{day: 'friday', start: '08:00', end: '16:00'}]},
  {userId: '11', availability: [{day: 'monday', start: '14:00', end: '18:00'}, {day: 'sunday', start: '09:00', end: '13:00'}]},
  {userId: '12', availability: [{day: 'tuesday', start: '10:00', end: '14:00'}, {day: 'thursday', start: '16:00', end: '20:00'}]},
  {userId: '13', availability: [{day: 'wednesday', start: '09:00', end: '12:00'}, {day: 'friday', start: '14:00', end: '17:00'}]},
  {userId: '14', availability: [{day: 'monday', start: '09:00', end: '17:00'}, {day: 'tuesday', start: '09:00', end: '17:00'}]}
] AS profiles
UNWIND profiles AS profile
MATCH (u:Usuario {userId: profile.userId})
OPTIONAL MATCH (u)-[old:DISPONIBLE_EN]->(:Disponibilidad)
DELETE old
WITH u, profile
UNWIND profile.availability AS slot
CREATE (availability:Disponibilidad {day: slot.day, start: slot.start, end: slot.end, updatedAt: datetime()})
CREATE (u)-[:DISPONIBLE_EN]->(availability);

// Experiencia para usuarios base 1-4
WITH [
  {userId: '1', skills: [{skill: 'React', years: 4, level: 'advanced'}, {skill: 'Node.js', years: 3, level: 'intermediate'}, {skill: 'Liderazgo', years: 2, level: 'intermediate'}]},
  {userId: '2', skills: [{skill: 'Java', years: 5, level: 'expert'}, {skill: 'Docker', years: 3, level: 'advanced'}, {skill: 'SQL', years: 4, level: 'advanced'}]},
  {userId: '3', skills: [{skill: 'Figma', years: 4, level: 'advanced'}, {skill: 'User Research', years: 3, level: 'intermediate'}]},
  {userId: '4', skills: [{skill: 'Python', years: 5, level: 'advanced'}, {skill: 'Machine Learning', years: 3, level: 'intermediate'}]}
] AS base
UNWIND base AS row
MATCH (u:Usuario {userId: row.userId})
UNWIND row.skills AS sk
MATCH (skill:Habilidad {normalizedName: toLower(sk.skill)})
MERGE (u)-[exp:TIENE_EXPERIENCIA_EN]->(skill)
SET exp.yearsOfExperience = toFloat(sk.years),
    exp.level = sk.level,
    exp.updatedAt = datetime();
