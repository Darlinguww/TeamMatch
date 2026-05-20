// Extended experience data para usuarios adicionales

WITH [
  {userId: '5', experiences: [
    {skill: 'React', years: 4, level: 'advanced'},
    {skill: 'TypeScript', years: 3, level: 'advanced'},
    {skill: 'Figma', years: 2, level: 'intermediate'},
    {skill: 'Diseño UX', years: 3, level: 'advanced'}
  ]},
  {userId: '6', experiences: [
    {skill: 'Java', years: 6, level: 'expert'},
    {skill: 'Spring Boot', years: 4, level: 'advanced'},
    {skill: 'PostgreSQL', years: 5, level: 'advanced'},
    {skill: 'Docker', years: 3, level: 'intermediate'}
  ]},
  {userId: '7', experiences: [
    {skill: 'Python', years: 5, level: 'expert'},
    {skill: 'Data Science', years: 4, level: 'advanced'},
    {skill: 'Machine Learning', years: 3, level: 'advanced'},
    {skill: 'SQL', years: 5, level: 'expert'}
  ]},
  {userId: '8', experiences: [
    {skill: 'Kubernetes', years: 4, level: 'advanced'},
    {skill: 'Docker', years: 5, level: 'expert'},
    {skill: 'AWS', years: 4, level: 'advanced'},
    {skill: 'CI/CD', years: 3, level: 'advanced'}
  ]},
  {userId: '9', experiences: [
    {skill: 'Vue.js', years: 4, level: 'advanced'},
    {skill: 'CSS', years: 5, level: 'expert'},
    {skill: 'HTML5', years: 5, level: 'expert'},
    {skill: 'Web Design', years: 3, level: 'intermediate'}
  ]},
  {userId: '10', experiences: [
    {skill: 'Node.js', years: 5, level: 'expert'},
    {skill: 'Express', years: 4, level: 'advanced'},
    {skill: 'MongoDB', years: 4, level: 'advanced'},
    {skill: 'GraphQL', years: 2, level: 'intermediate'}
  ]},
  {userId: '11', experiences: [
    {skill: 'Liderazgo', years: 6, level: 'expert'},
    {skill: 'Comunicación', years: 7, level: 'expert'},
    {skill: 'Agile', years: 5, level: 'advanced'},
    {skill: 'Product Management', years: 4, level: 'advanced'}
  ]},
  {userId: '12', experiences: [
    {skill: 'Seguridad', years: 7, level: 'expert'},
    {skill: 'Pentesting', years: 5, level: 'advanced'},
    {skill: 'Cryptografía', years: 4, level: 'advanced'},
    {skill: 'Compliance', years: 3, level: 'intermediate'}
  ]},
  {userId: '13', experiences: [
    {skill: 'QA Testing', years: 5, level: 'advanced'},
    {skill: 'Automatización', years: 4, level: 'advanced'},
    {skill: 'Selenium', years: 4, level: 'advanced'},
    {skill: 'Pytest', years: 3, level: 'intermediate'}
  ]},
  {userId: '14', experiences: [
    {skill: 'React Native', years: 4, level: 'advanced'},
    {skill: 'Flutter', years: 2, level: 'intermediate'},
    {skill: 'Mobile Dev', years: 5, level: 'expert'},
    {skill: 'Swift', years: 3, level: 'intermediate'}
  ]},
  {userId: '15', experiences: [
    {skill: 'UX Research', years: 5, level: 'expert'},
    {skill: 'Figma', years: 4, level: 'advanced'},
    {skill: 'User Testing', years: 4, level: 'advanced'},
    {skill: 'Prototyping', years: 3, level: 'intermediate'}
  ]},
  {userId: '16', experiences: [
    {skill: 'Go', years: 3, level: 'intermediate'},
    {skill: 'Rust', years: 2, level: 'intermediate'},
    {skill: 'System Design', years: 5, level: 'expert'},
    {skill: 'Performance', years: 4, level: 'advanced'}
  ]},
  {userId: '17', experiences: [
    {skill: 'Escritura Técnica', years: 6, level: 'expert'},
    {skill: 'Documentación', years: 6, level: 'expert'},
    {skill: 'Marketing', years: 4, level: 'advanced'},
    {skill: 'Copy', years: 3, level: 'intermediate'}
  ]},
  {userId: '18', experiences: [
    {skill: 'Analytics', years: 5, level: 'expert'},
    {skill: 'Data Visualization', years: 4, level: 'advanced'},
    {skill: 'BI', years: 3, level: 'intermediate'},
    {skill: 'Tableau', years: 2, level: 'intermediate'}
  ]},
  {userId: '19', experiences: [
    {skill: 'Comunicación', years: 7, level: 'expert'},
    {skill: 'Community Management', years: 5, level: 'advanced'},
    {skill: 'Social Media', years: 4, level: 'advanced'},
    {skill: 'Eventos', years: 3, level: 'intermediate'}
  ]},
  {userId: '20', experiences: [
    {skill: 'Blockchain', years: 2, level: 'intermediate'},
    {skill: 'Smart Contracts', years: 2, level: 'intermediate'},
    {skill: 'Solidity', years: 1, level: 'beginner'},
    {skill: 'Web3', years: 2, level: 'intermediate'}
  ]}
] AS profiles
UNWIND profiles AS profile
MATCH (u:Usuario {userId: profile.userId})
UNWIND profile.experiences AS exp
MATCH (skill:Habilidad {normalizedName: toLower(exp.skill)})
MERGE (u)-[rel:TIENE_EXPERIENCIA_EN]->(skill)
SET rel.yearsOfExperience = exp.years,
    rel.level = exp.level,
    rel.nivel = exp.level;
