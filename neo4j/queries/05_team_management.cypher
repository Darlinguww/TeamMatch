// SCRUM-205 — Gestión de equipo (esquema canónico)
// Preferir backend: TeamRepository.assignMemberFromMatchmaking / addMembers

MATCH (u:Usuario { email: $emailUsuario })
MATCH (p:Proyecto { projectId: $projectId })
MERGE (u)-[r:PERTENECE_A]->(p)
ON CREATE SET r.rol = 'miembro', r.fechaAsignacion = datetime()
ON MATCH SET r.rol = 'miembro', r.actualizadoEn = datetime()
RETURN u.email AS usuario, p.projectId AS proyecto, r.rol AS rol_asignado;

// Remover miembro (no líder)
MATCH (u:Usuario { email: $emailUsuario })-[r:PERTENECE_A]->(p:Proyecto { projectId: $projectId })
WHERE r.rol <> 'lider'
OPTIONAL MATCH (p)-[:CONTIENE]->(t:Tarea)-[a:ASIGNADO_A]->(u)
DELETE a, r
RETURN u.email AS usuario_removido, p.projectId AS proyecto_afectado;
