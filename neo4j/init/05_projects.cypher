// Proyectos semilla compatibles con las APIs del backend.

MERGE (p1:Proyecto {projectId: 'p1'})
SET p1.proyectoId = 'p1',
    p1.title = 'Aplicacion Movil de Voluntariado',
    p1.nombre = 'Aplicacion Movil de Voluntariado',
    p1.summary = 'Conecta voluntarios con organizaciones locales.',
    p1.description = 'Desarrollo de una app movil para descubrir oportunidades, coordinar turnos y medir impacto comunitario.',
    p1.descripcion = 'Desarrollo de una app movil para descubrir oportunidades, coordinar turnos y medir impacto comunitario.',
    p1.status = 'open',
    p1.estado = 'open',
    p1.createdAt = coalesce(p1.createdAt, '2026-05-01T09:00:00.000Z');

MERGE (p2:Proyecto {projectId: 'p2'})
SET p2.proyectoId = 'p2',
    p2.title = 'Plataforma de Salud Digital',
    p2.nombre = 'Plataforma de Salud Digital',
    p2.summary = 'Gestion segura de pacientes y analitica clinica.',
    p2.description = 'Sistema web para registros, autorizaciones y tableros de seguimiento con foco en seguridad.',
    p2.descripcion = 'Sistema web para registros, autorizaciones y tableros de seguimiento con foco en seguridad.',
    p2.status = 'open',
    p2.estado = 'open',
    p2.createdAt = coalesce(p2.createdAt, '2026-05-02T09:00:00.000Z');

MERGE (p3:Proyecto {projectId: 'p3'})
SET p3.proyectoId = 'p3',
    p3.title = 'Dashboard de Analitica Educativa',
    p3.nombre = 'Dashboard de Analitica Educativa',
    p3.summary = 'Visualizacion de progreso academico para equipos docentes.',
    p3.description = 'Dashboard web con metricas, alertas tempranas y recomendaciones accionables.',
    p3.descripcion = 'Dashboard web con metricas, alertas tempranas y recomendaciones accionables.',
    p3.status = 'open',
    p3.estado = 'open',
    p3.createdAt = coalesce(p3.createdAt, '2026-05-03T09:00:00.000Z');

WITH [
  {projectId: 'p1', roles: [
    {name: 'Frontend Developer', skills: ['React Native', 'JavaScript']},
    {name: 'UX Designer', skills: ['Figma', 'User Research']},
    {name: 'Backend Developer', skills: ['Node.js', 'MongoDB']}
  ]},
  {projectId: 'p2', roles: [
    {name: 'Full Stack Developer', skills: ['React', 'Java', 'SQL']},
    {name: 'Security Specialist', skills: ['Security', 'Encryption']},
    {name: 'Product Manager', skills: ['Liderazgo', 'Comunicacion']}
  ]},
  {projectId: 'p3', roles: [
    {name: 'Frontend Developer', skills: ['React', 'CSS']},
    {name: 'Backend Developer', skills: ['Node.js', 'MongoDB']},
    {name: 'UI/UX Designer', skills: ['Figma', 'User Research']}
  ]}
] AS projects
UNWIND projects AS projectInput
MATCH (project:Proyecto {projectId: projectInput.projectId})
UNWIND projectInput.roles AS roleInput
MERGE (role:Rol {roleId: projectInput.projectId + ':' + roleInput.name})
SET role.name = roleInput.name
MERGE (project)-[:TIENE_ROL]->(role)
WITH role, roleInput
UNWIND roleInput.skills AS skillName
MERGE (skill:Habilidad {normalizedName: toLower(skillName)})
ON CREATE SET skill.name = skillName, skill.createdAt = datetime()
SET skill.updatedAt = datetime()
MERGE (role)-[:REQUIERE]->(skill);
