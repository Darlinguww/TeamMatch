// =======================================================================
// VERIFICACIÓN DE INSTALACIÓN DE GDS Y APOC
// Ejecutar estos comandos en Neo4j Browser después de iniciar el contenedor
// =======================================================================
// Verificar versión de GDS instalada (SCRUM-185)
CALL gds.version() YIELD gdsVersion
RETURN gdsVersion AS version;

// Listar procedimientos disponibles de GDS
CALL gds.list() YIELD name, description
RETURN name, description
LIMIT 20;

// Verificar que APOC está disponible
CALL apoc.help() YIELD text
RETURN text
LIMIT 5;

// Verificar disponibilidad de algoritmos de similitud
CALL gds.list() YIELD name
  WHERE name CONTAINS 'similarity'
RETURN name;

// Verificar configuración de procedimientos permitidos
CALL dbms.listConfig() YIELD name, value
  WHERE name CONTAINS 'procedures'
RETURN name, value;