// Extended projects y team memberships con usuarios adicionales

WITH [
  {projectId: 'p4', title: 'Plataforma de E-Learning', roles: [
    {name: 'Frontend Developer', skills: ['React', 'TypeScript']},
    {name: 'Backend Developer', skills: ['Node.js', 'PostgreSQL']},
    {name: 'UX Designer', skills: ['Figma', 'User Research']}
  ]},
  {projectId: 'p5', title: 'Sistema de CRM', roles: [
    {name: 'Full Stack Developer', skills: ['Vue.js', 'Java']},
    {name: 'Database Admin', skills: ['PostgreSQL', 'Backup']},
    {name: 'QA Engineer', skills: ['Testing', 'Automation']}
  ]},
  {projectId: 'p6', title: 'App Móvil de Fitness', roles: [
    {name: 'Mobile Developer', skills: ['React Native', 'Swift']},
    {name: 'Backend Developer', skills: ['Node.js', 'MongoDB']},
    {name: 'Product Manager', skills: ['Liderazgo', 'Comunicación']}
  ]},
  {projectId: 'p7', title: 'Plataforma de Analytics', roles: [
    {name: 'Data Engineer', skills: ['Python', 'SQL']},
    {name: 'Frontend Developer', skills: ['React', 'D3.js']},
    {name: 'DevOps Engineer', skills: ['Kubernetes', 'AWS']}
  ]},
  {projectId: 'p8', title: 'Sistema de Pagos', roles: [
    {name: 'Backend Developer', skills: ['Java', 'Spring Boot']},
    {name: 'Security Specialist', skills: ['Security', 'Encryption']},
    {name: 'QA Engineer', skills: ['Testing', 'Pytest']}
  ]}
] AS projects
UNWIND projects AS project
MERGE (p:Proyecto {projectId: project.projectId})
SET p.proyectoId = project.projectId,
    p.title = project.title,
    p.nombre = project.title,
    p.summary = 'Proyecto importante para el equipo',
    p.description = 'Desarrollo de ' + project.title + ' con enfoque en calidad',
    p.descripcion = 'Desarrollo de ' + project.title + ' con enfoque en calidad',
    p.status = 'open',
    p.estado = 'open',
    p.createdAt = coalesce(p.createdAt, datetime())
WITH p, project
UNWIND project.roles AS roleInput
MERGE (role:Rol {roleId: project.projectId + ':' + roleInput.name})
SET role.name = roleInput.name
MERGE (p)-[:TIENE_ROL]->(role)
WITH role, roleInput
UNWIND roleInput.skills AS skillName
MERGE (skill:Habilidad {normalizedName: toLower(skillName)})
ON CREATE SET skill.name = skillName, skill.createdAt = datetime()
SET skill.updatedAt = datetime()
MERGE (role)-[:REQUIERE]->(skill);

// Asignar líderes y miembros a nuevos proyectos
WITH [
  {projectId: 'p4', leaderId: '5', memberIds: ['6', '7', '9']},
  {projectId: 'p5', leaderId: '6', memberIds: ['10', '13', '18']},
  {projectId: 'p6', leaderId: '14', memberIds: ['9', '10', '11']},
  {projectId: 'p7', leaderId: '7', memberIds: ['18', '16', '8']},
  {projectId: 'p8', leaderId: '12', memberIds: ['6', '13', '16']}
] AS projectAssignments
UNWIND projectAssignments AS assignment
MATCH (project:Proyecto {projectId: assignment.projectId})
MATCH (leader:Usuario {userId: assignment.leaderId})
MERGE (leader)-[leaderMembership:PERTENECE_A]->(project)
SET leaderMembership.rol = 'lider',
    leaderMembership.role = 'lider',
    leaderMembership.isLeader = true,
    leaderMembership.joinedAt = coalesce(leaderMembership.joinedAt, date())
WITH project, assignment
UNWIND assignment.memberIds AS memberId
MATCH (member:Usuario {userId: memberId})
MERGE (member)-[membership:PERTENECE_A]->(project)
SET membership.rol = 'miembro',
    membership.role = 'miembro',
    membership.isLeader = false,
    membership.joinedAt = coalesce(membership.joinedAt, date());
