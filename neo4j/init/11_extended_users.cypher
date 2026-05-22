// Extended seed data con muchos mas usuarios variados para testing realista

// Usuarios adicionales con skills especializadas
WITH [
  {userId: '5', email: 'alejandra.s@example.com', name: 'Alejandra Santos', skills: ['React', 'TypeScript', 'Diseño UX', 'Figma'], availability: [
    {day: 'monday', start: '10:00', end: '14:00'},
    {day: 'thursday', start: '15:00', end: '19:00'}
  ]},
  {userId: '6', email: 'martin.c@example.com', name: 'Martín Córdoba', skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'], availability: [
    {day: 'tuesday', start: '09:00', end: '13:00'},
    {day: 'wednesday', start: '09:00', end: '13:00'},
    {day: 'friday', start: '14:00', end: '18:00'}
  ]},
  {userId: '7', email: 'sofia.m@example.com', name: 'Sofía Morales', skills: ['Python', 'Data Science', 'Machine Learning', 'SQL'], availability: [
    {day: 'monday', start: '13:00', end: '17:00'},
    {day: 'wednesday', start: '10:00', end: '14:00'},
    {day: 'saturday', start: '10:00', end: '14:00'}
  ]},
  {userId: '8', email: 'jorge.g@example.com', name: 'Jorge García', skills: ['DevOps', 'Kubernetes', 'AWS', 'CI/CD'], availability: [
    {day: 'monday', start: '08:00', end: '12:00'},
    {day: 'wednesday', start: '14:00', end: '18:00'},
    {day: 'friday', start: '08:00', end: '12:00'}
  ]},
  {userId: '9', email: 'clara.r@example.com', name: 'Clara Rodríguez', skills: ['Vue.js', 'CSS', 'HTML5', 'Web Design'], availability: [
    {day: 'tuesday', start: '14:00', end: '18:00'},
    {day: 'thursday', start: '09:00', end: '13:00'},
    {day: 'friday', start: '15:00', end: '19:00'}
  ]},
  {userId: '10', email: 'luis.p@example.com', name: 'Luis Pérez', skills: ['Node.js', 'Express', 'MongoDB', 'GraphQL'], availability: [
    {day: 'monday', start: '09:00', end: '17:00'},
    {day: 'tuesday', start: '09:00', end: '17:00'},
    {day: 'wednesday', start: '09:00', end: '12:00'}
  ]},
  {userId: '11', email: 'paula.h@example.com', name: 'Paula Hernández', skills: ['Product Management', 'Liderazgo', 'Comunicación', 'Agile'], availability: [
    {day: 'monday', start: '09:00', end: '17:00'},
    {day: 'wednesday', start: '09:00', end: '17:00'},
    {day: 'friday', start: '09:00', end: '17:00'}
  ]},
  {userId: '12', email: 'ricardo.l@example.com', name: 'Ricardo López', skills: ['Seguridad', 'Pentesting', 'Cryptografía', 'Compliance'], availability: [
    {day: 'tuesday', start: '08:00', end: '16:00'},
    {day: 'thursday', start: '08:00', end: '16:00'},
    {day: 'friday', start: '09:00', end: '13:00'}
  ]},
  {userId: '13', email: 'mariana.d@example.com', name: 'Mariana Díaz', skills: ['QA Testing', 'Automatización', 'Selenium', 'Pytest'], availability: [
    {day: 'monday', start: '10:00', end: '18:00'},
    {day: 'wednesday', start: '10:00', end: '18:00'},
    {day: 'thursday', start: '10:00', end: '14:00'}
  ]},
  {userId: '14', email: 'andrés.n@example.com', name: 'Andrés Navarro', skills: ['React Native', 'Flutter', 'Mobile Dev', 'Swift'], availability: [
    {day: 'tuesday', start: '10:00', end: '18:00'},
    {day: 'thursday', start: '10:00', end: '18:00'},
    {day: 'saturday', start: '14:00', end: '18:00'}
  ]},
  {userId: '15', email: 'isabelle.f@example.com', name: 'Isabelle Fournier', skills: ['UX Research', 'Figma', 'User Testing', 'Prototyping'], availability: [
    {day: 'monday', start: '11:00', end: '19:00'},
    {day: 'wednesday', start: '11:00', end: '19:00'},
    {day: 'friday', start: '10:00', end: '14:00'}
  ]},
  {userId: '16', email: 'victor.r@example.com', name: 'Víctor Ramírez', skills: ['Go', 'Rust', 'System Design', 'Performance'], availability: [
    {day: 'monday', start: '09:00', end: '17:00'},
    {day: 'tuesday', start: '09:00', end: '17:00'},
    {day: 'thursday', start: '09:00', end: '13:00'}
  ]},
  {userId: '17', email: 'elena.v@example.com', name: 'Elena Vázquez', skills: ['Escritura Técnica', 'Documentación', 'Marketing', 'Copy'], availability: [
    {day: 'monday', start: '14:00', end: '18:00'},
    {day: 'wednesday', start: '14:00', end: '18:00'},
    {day: 'friday', start: '10:00', end: '14:00'}
  ]},
  {userId: '18', email: 'gabriel.m@example.com', name: 'Gabriel Moreno', skills: ['Analytics', 'Data Visualization', 'BI', 'Tableau'], availability: [
    {day: 'tuesday', start: '09:00', end: '17:00'},
    {day: 'wednesday', start: '14:00', end: '18:00'},
    {day: 'friday', start: '09:00', end: '17:00'}
  ]},
  {userId: '19', email: 'nadia.b@example.com', name: 'Nadia Bautista', skills: ['Comunicación', 'Community Management', 'Social Media', 'Eventos'], availability: [
    {day: 'monday', start: '09:00', end: '18:00'},
    {day: 'wednesday', start: '09:00', end: '18:00'},
    {day: 'thursday', start: '13:00', end: '17:00'}
  ]},
  {userId: '20', email: 'octavio.s@example.com', name: 'Octavio Silva', skills: ['Blockchain', 'Smart Contracts', 'Solidity', 'Web3'], availability: [
    {day: 'tuesday', start: '15:00', end: '23:00'},
    {day: 'thursday', start: '15:00', end: '23:00'},
    {day: 'sunday', start: '14:00', end: '18:00'}
  ]}
] AS profiles
UNWIND profiles AS profile
MERGE (u:Usuario {userId: profile.userId})
SET u.email = profile.email,
    u.user = profile.name,
    u.name = profile.name,
    u.passwordHash = coalesce(u.passwordHash, '$2a$10$4OOSpI.zvLZ7LblVs6p33uH8RY9JDkq8NS77U6ZtmlZZ/5B5lvNLu'),
    u.updatedAt = datetime()
WITH u, profile
UNWIND profile.skills AS skillName
MERGE (skill:Habilidad {normalizedName: toLower(skillName)})
ON CREATE SET skill.name = skillName, skill.createdAt = datetime()
SET skill.updatedAt = datetime()
MERGE (u)-[:TIENE_HABILIDAD]->(skill);

WITH [
  {userId: '5', availability: [{day: 'monday', start: '10:00', end: '14:00'}, {day: 'thursday', start: '15:00', end: '19:00'}]},
  {userId: '6', availability: [{day: 'tuesday', start: '09:00', end: '13:00'}, {day: 'wednesday', start: '09:00', end: '13:00'}, {day: 'friday', start: '14:00', end: '18:00'}]},
  {userId: '7', availability: [{day: 'monday', start: '13:00', end: '17:00'}, {day: 'wednesday', start: '10:00', end: '14:00'}, {day: 'saturday', start: '10:00', end: '14:00'}]},
  {userId: '8', availability: [{day: 'monday', start: '08:00', end: '12:00'}, {day: 'wednesday', start: '14:00', end: '18:00'}, {day: 'friday', start: '08:00', end: '12:00'}]},
  {userId: '9', availability: [{day: 'tuesday', start: '14:00', end: '18:00'}, {day: 'thursday', start: '09:00', end: '13:00'}, {day: 'friday', start: '15:00', end: '19:00'}]},
  {userId: '10', availability: [{day: 'monday', start: '09:00', end: '17:00'}, {day: 'tuesday', start: '09:00', end: '17:00'}, {day: 'wednesday', start: '09:00', end: '12:00'}]},
  {userId: '11', availability: [{day: 'monday', start: '09:00', end: '17:00'}, {day: 'wednesday', start: '09:00', end: '17:00'}, {day: 'friday', start: '09:00', end: '17:00'}]},
  {userId: '12', availability: [{day: 'tuesday', start: '08:00', end: '16:00'}, {day: 'thursday', start: '08:00', end: '16:00'}, {day: 'friday', start: '09:00', end: '13:00'}]},
  {userId: '13', availability: [{day: 'monday', start: '10:00', end: '18:00'}, {day: 'wednesday', start: '10:00', end: '18:00'}, {day: 'thursday', start: '10:00', end: '14:00'}]},
  {userId: '14', availability: [{day: 'tuesday', start: '10:00', end: '18:00'}, {day: 'thursday', start: '10:00', end: '18:00'}, {day: 'saturday', start: '14:00', end: '18:00'}]},
  {userId: '15', availability: [{day: 'monday', start: '11:00', end: '19:00'}, {day: 'wednesday', start: '11:00', end: '19:00'}, {day: 'friday', start: '10:00', end: '14:00'}]},
  {userId: '16', availability: [{day: 'monday', start: '09:00', end: '17:00'}, {day: 'tuesday', start: '09:00', end: '17:00'}, {day: 'thursday', start: '09:00', end: '13:00'}]},
  {userId: '17', availability: [{day: 'monday', start: '14:00', end: '18:00'}, {day: 'wednesday', start: '14:00', end: '18:00'}, {day: 'friday', start: '10:00', end: '14:00'}]},
  {userId: '18', availability: [{day: 'tuesday', start: '09:00', end: '17:00'}, {day: 'wednesday', start: '14:00', end: '18:00'}, {day: 'friday', start: '09:00', end: '17:00'}]},
  {userId: '19', availability: [{day: 'monday', start: '09:00', end: '18:00'}, {day: 'wednesday', start: '09:00', end: '18:00'}, {day: 'thursday', start: '13:00', end: '17:00'}]},
  {userId: '20', availability: [{day: 'tuesday', start: '15:00', end: '23:00'}, {day: 'thursday', start: '15:00', end: '23:00'}, {day: 'sunday', start: '14:00', end: '18:00'}]}
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
