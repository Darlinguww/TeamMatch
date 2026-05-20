// Restricted application user for Node.js services (least privilege).
// Run once as neo4j admin after constraints/indexes. Replace placeholders before use.
//
// Required env for backend:
//   NEO4J_USER=teammatch_app
//   NEO4J_PASSWORD=<strong-password>
//
// Grants: read/write on application labels only; denies admin procedures.

CREATE USER teammatch_app IF NOT EXISTS
  SET PASSWORD $appPassword CHANGE NOT REQUIRED
  SET STATUS ACTIVE;

// Example grants — adjust labels to your graph model
GRANT MATCH {*} ON GRAPH teammatch TO teammatch_app;
GRANT READ {Proyecto, Usuario, Habilidad, Tarea, Equipo, Evaluacion} ON GRAPH teammatch TO teammatch_app;
GRANT WRITE ON GRAPH teammatch FOR Proyecto, Usuario, Habilidad, Tarea, Equipo, Evaluacion TO teammatch_app;

// Deny schema and admin
DENY ACCESS ON DATABASE teammatch WHERE action = schema TO teammatch_app;
DENY EXECUTE PROCEDURE * ON DBMS TO teammatch_app;
