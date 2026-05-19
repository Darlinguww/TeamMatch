// =======================================================================
// PROYECCIÓN GDS: TEAMGRAPH Y SIMILITUD DE USUARIOS (SCRUM-187)
// Grafo optimizado para calcular similitud entre usuarios por habilidades
// =======================================================================

// STEP 1: Crear proyección 'teamgraph' con nodos Usuario, Habilidad, Proyecto
// y relaciones TIENE_HABILIDAD, REQUIERE, PERTENECE_A
CALL gds.graph.project(
  'teamgraph',
  {
    Usuario: { properties: ['userId', 'name'] },
    Habilidad: { properties: ['nombre', 'categoria'] },
    Proyecto: { properties: ['projectId', 'nombre'] }
  },
  {
    TIENE_HABILIDAD: { type: 'TIENE_HABILIDAD', properties: ['nivel'], orientation: 'UNDIRECTED' },
    REQUIERE: { type: 'REQUIERE', properties: ['prioridad'], orientation: 'UNDIRECTED' },
    PERTENECE_A: { type: 'PERTENECE_A', properties: ['rol'], orientation: 'NATURAL' }
  }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;

// STEP 2: Verificar que la proyección se creó correctamente
CALL gds.graph.list()
WHERE graphName = 'teamgraph'
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;

// STEP 3: Ejecutar Node Similarity entre Usuarios basado en habilidades compartidas
// Retorna: usuario1, usuario2, similarityScore (filtrado > 0.5)
CALL gds.nodeSimilarity.stream('teamgraph', {
  sourceNodeFilter: 'Usuario',
  targetNodeFilter: 'Usuario',
  topK: 10,
  similarityCutoff: 0.5
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS usuario1, gds.util.asNode(node2) AS usuario2, similarity
RETURN usuario1.userId AS usuario1_id,
       usuario1.name AS usuario1_name,
       usuario2.userId AS usuario2_id,
       usuario2.name AS usuario2_name,
       ROUND(similarity, 3) AS similarityScore
ORDER BY similarityScore DESC;

// STEP 4: Consulta parametrizada: Encontrar usuarios similares para un usuario específico
// Parámetros: $userId
CALL gds.nodeSimilarity.stream('teamgraph', {
  sourceNodeFilter: 'Usuario',
  targetNodeFilter: 'Usuario',
  topK: 5,
  similarityCutoff: 0.3
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS u1, gds.util.asNode(node2) AS u2, similarity
WHERE u1.userId = $userId
RETURN u2.userId AS usuarioSimilar,
       u2.name AS nombre,
       ROUND(similarity, 3) AS scoreAfinidad
ORDER BY scoreAfinidad DESC;
