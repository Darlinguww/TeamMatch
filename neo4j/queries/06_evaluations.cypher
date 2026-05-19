// =======================================================================
// SCRUM-223: SISTEMA DE CO-EVALUACIÓN Y RESTRICCIONES DE UNICIDAD
// Consultas y reglas de integridad para el Backend de TeamMatch
// =======================================================================

// -----------------------------------------------------------------------
// TAREA A: Crear Constraint de Evaluación Única
// -----------------------------------------------------------------------
// Asegura que no exista más de una relación EVALUÓ entre el mismo par de
// usuarios para un mismo proyectoID, blindando el sistema contra IDOR o duplicados.
CREATE CONSTRAINT evaluacion_unica_idx IF NOT EXISTS
FOR ()-[r:EVALUO]-()
REQUIRE (r.evaluadorId, r.evaluadoId, r.proyectoId) IS UNIQUE;


// -----------------------------------------------------------------------
// TAREA B: Registrar una nueva Co-evaluación
// -----------------------------------------------------------------------
// Parámetros: $emailEvaluador, $emailEvaluado, $proyectoId, 
//             $notaCom, $notaResp, $notaTec, $comentario
MATCH (evaluador:Usuario {email: $emailEvaluador})
MATCH (evaluado:Usuario {email: $emailEvaluado})

// Validamos estructuralmente que ambos pertenezcan al mismo proyecto antes de evaluar
MATCH (evaluador)-[:PERTENECE_A]->(p:Proyecto {proyectoId: $proyectoId})<-[:PERTENECE_A]-(evaluado)

// Creamos la relación aplicando las propiedades oficiales del PDF
MERGE (evaluador)-[e:EVALUO]->(evaluado)
ON CREATE SET 
  e.proyectoId = p.proyectoId,
  e.evaluadorId = evaluador.userId,
  e.evaluadoId = evaluado.userId,
  e.nota_comunicacion = toFloat($notaCom),
  e.nota_responsabilidad = toFloat($notaResp),
  e.nota_tecnica = toFloat($notaTec),
  e.comentario = $comentario

RETURN evaluador.nombre AS de, evaluado.nombre AS para, e.comentario AS feedback;