MATCH (u1:Usuario { email: 'daniel.cera@teammatch.com' })
MATCH (u2:Usuario { email: 'andrea.ossa@teammatch.com' })
MATCH (u3:Usuario { email: 'nicolas.perez@teammatch.com' })
MATCH (p1:Proyecto { projectId: 'prj_001' })
MATCH (p2:Proyecto { projectId: 'prj_002' })

MERGE (u1)-[r1:PERTENECE_A]->(p1)
ON CREATE SET r1.rol = 'lider', r1.fechaAsignacion = datetime();

MERGE (u2)-[r2:PERTENECE_A]->(p1)
ON CREATE SET r2.rol = 'miembro', r2.fechaAsignacion = datetime();

MERGE (u3)-[r3:PERTENECE_A]->(p2)
ON CREATE SET r3.rol = 'lider', r3.fechaAsignacion = datetime();

MERGE (u1)-[r4:PERTENECE_A]->(p2)
ON CREATE SET r4.rol = 'miembro', r4.fechaAsignacion = datetime();
