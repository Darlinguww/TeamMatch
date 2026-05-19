// 1. Buscar los usuarios de prueba existentes (por email) y los proyectos (por proyectoId)
MATCH (u1:Usuario {email: 'daniel.cera@teammatch.com'})
MATCH (u2:Usuario {email: 'andrea.ossa@teammatch.com'})
MATCH (u3:Usuario {email: 'nicolas.perez@teammatch.com'})

MATCH (p1:Proyecto {proyectoId: 'prj_001'})
MATCH (p2:Proyecto {proyectoId: 'prj_002'})

// 2. Crear las relaciones :PERTENECE_A asignando el atributo 'rol' oficial (Líder / Miembro)

MERGE (u1)-[r1:PERTENECE_A]->(p1)
ON CREATE SET r1.rol = 'Líder';

MERGE (u2)-[r2:PERTENECE_A]->(p1)
ON CREATE SET r2.rol = 'Miembro';


MERGE (u3)-[r3:PERTENECE_A]->(p2)
ON CREATE SET r3.rol = 'Líder';

MERGE (u1)-[r4:PERTENECE_A]->(p2)
ON CREATE SET r4.rol = 'Miembro';