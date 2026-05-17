CREATE CONSTRAINT user_email_unique IF NOT EXISTS
FOR (u:Usuario)
REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:Usuario)
REQUIRE u.userId IS UNIQUE;

CREATE CONSTRAINT project_id_unique IF NOT EXISTS
FOR (p:Proyecto)
REQUIRE p.projectId IS UNIQUE;

CREATE CONSTRAINT skill_name_unique IF NOT EXISTS
FOR (s:Habilidad)
REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT role_id_unique IF NOT EXISTS
FOR (r:Rol)
REQUIRE r.roleId IS UNIQUE;
