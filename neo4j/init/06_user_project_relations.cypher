// Membresias semilla. El atributo rol se guarda en ASCII y tambien como role
// para que las consultas legacy y nuevas encuentren al lider.

WITH [
  {projectId: 'p1', userId: '1', role: 'lider'},
  {projectId: 'p1', userId: '2', role: 'miembro'},
  {projectId: 'p1', userId: '3', role: 'miembro'},
  {projectId: 'p2', userId: '2', role: 'lider'},
  {projectId: 'p2', userId: '1', role: 'miembro'},
  {projectId: 'p3', userId: '3', role: 'lider'},
  {projectId: 'p3', userId: '4', role: 'miembro'}
] AS memberships
UNWIND memberships AS item
MATCH (user:Usuario {userId: item.userId})
MATCH (project:Proyecto {projectId: item.projectId})
MERGE (user)-[membership:PERTENECE_A]->(project)
SET membership.rol = item.role,
    membership.role = item.role,
    membership.isLeader = item.role = 'lider',
    membership.joinedAt = coalesce(membership.joinedAt, date());
