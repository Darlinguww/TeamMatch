// Seed base para usuarios reales del grafo de TeamMatch.
// Mantiene IDs y emails alineados con los mocks del frontend para que API y UI
// puedan convivir despues de reiniciar la base de datos.

MERGE (u1:Usuario {userId: '1'})
SET u1.email = 'maria.garcia@example.com',
    u1.user = 'Maria Garcia',
    u1.name = 'Maria Garcia',
    u1.passwordHash = coalesce(u1.passwordHash, '$2a$10$4OOSpI.zvLZ7LblVs6p33uH8RY9JDkq8NS77U6ZtmlZZ/5B5lvNLu'),
    u1.updatedAt = datetime();

MERGE (u2:Usuario {userId: '2'})
SET u2.email = 'carlos.r@example.com',
    u2.user = 'Carlos Rodriguez',
    u2.name = 'Carlos Rodriguez',
    u2.passwordHash = coalesce(u2.passwordHash, '$2a$10$4OOSpI.zvLZ7LblVs6p33uH8RY9JDkq8NS77U6ZtmlZZ/5B5lvNLu'),
    u2.updatedAt = datetime();

MERGE (u3:Usuario {userId: '3'})
SET u3.email = 'ana.m@example.com',
    u3.user = 'Ana Martinez',
    u3.name = 'Ana Martinez',
    u3.passwordHash = coalesce(u3.passwordHash, '$2a$10$4OOSpI.zvLZ7LblVs6p33uH8RY9JDkq8NS77U6ZtmlZZ/5B5lvNLu'),
    u3.updatedAt = datetime();

MERGE (u4:Usuario {userId: '4'})
SET u4.email = 'diego.l@example.com',
    u4.user = 'Diego Lopez',
    u4.name = 'Diego Lopez',
    u4.passwordHash = coalesce(u4.passwordHash, '$2a$10$4OOSpI.zvLZ7LblVs6p33uH8RY9JDkq8NS77U6ZtmlZZ/5B5lvNLu'),
    u4.updatedAt = datetime();

WITH [
  {userId: '1', skills: ['React', 'Node.js', 'Liderazgo', 'Comunicacion', 'Python'], availability: [
    {day: 'monday', start: '09:00', end: '12:00'},
    {day: 'wednesday', start: '14:00', end: '18:00'}
  ]},
  {userId: '2', skills: ['Java', 'Docker', 'SQL', 'Trabajo en equipo'], availability: [
    {day: 'tuesday', start: '18:00', end: '21:00'},
    {day: 'saturday', start: '09:00', end: '13:00'}
  ]},
  {userId: '3', skills: ['Figma', 'User Research', 'Creatividad', 'Adobe XD'], availability: [
    {day: 'monday', start: '15:00', end: '19:00'},
    {day: 'friday', start: '10:00', end: '13:00'}
  ]},
  {userId: '4', skills: ['Python', 'Machine Learning', 'TensorFlow', 'Analisis critico'], availability: [
    {day: 'thursday', start: '08:00', end: '12:00'},
    {day: 'sunday', start: '10:00', end: '14:00'}
  ]}
] AS profiles
UNWIND profiles AS profile
MATCH (u:Usuario {userId: profile.userId})
UNWIND profile.skills AS skillName
MERGE (skill:Habilidad {name: skillName})
ON CREATE SET skill.normalizedName = toLower(skillName), skill.createdAt = datetime()
SET skill.normalizedName = coalesce(skill.normalizedName, toLower(skillName)),
    skill.updatedAt = datetime()
MERGE (u)-[:TIENE_HABILIDAD]->(skill);

WITH [
  {userId: '1', availability: [
    {day: 'monday', start: '09:00', end: '12:00'},
    {day: 'wednesday', start: '14:00', end: '18:00'}
  ]},
  {userId: '2', availability: [
    {day: 'tuesday', start: '18:00', end: '21:00'},
    {day: 'saturday', start: '09:00', end: '13:00'}
  ]},
  {userId: '3', availability: [
    {day: 'monday', start: '15:00', end: '19:00'},
    {day: 'friday', start: '10:00', end: '13:00'}
  ]},
  {userId: '4', availability: [
    {day: 'thursday', start: '08:00', end: '12:00'},
    {day: 'sunday', start: '10:00', end: '14:00'}
  ]}
] AS profiles
UNWIND profiles AS profile
MATCH (u:Usuario {userId: profile.userId})
UNWIND profile.availability AS slot
CREATE (availability:Disponibilidad {
  day: slot.day,
  start: slot.start,
  end: slot.end,
  updatedAt: datetime()
})
CREATE (u)-[:DISPONIBLE_EN]->(availability);
