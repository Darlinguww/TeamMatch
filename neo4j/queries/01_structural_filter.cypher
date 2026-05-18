// =======================================================================
// FASE 1 DEL PIPELINE: FILTRADO ESTRUCTURAL (SCRUM-171)
// Desarrollado para que el Backend reduzca el universo de candidatos 
// antes de enviárselo al modelo de IA.
// =======================================================================

// Consulta Unificada para el algoritmo de Matchmaking:
MATCH (p:Proyecto {proyectoId: $proyectoId})-[r:REQUIERE]->(h:Habilidad)
MATCH (u:Usuario)-[th:TIENE_HABILIDAD]->(h)
MATCH (u)-[td:TIENE_DISPONIBILIDAD]->(d:Disponibilidad)

WITH p, u, h, r, th, d
WHERE (th.nivel = 'Avanzado' OR th.nivel = 'Intermedio' OR $permitirBasico = true)
  AND d.tipo_disponibilidad IN $disponibilidadesRequeridas
  AND ($validarAniosExperiencia = false OR th.anios_experiencia >= r.años_experiencia)

// Retornamos los perfiles limpios y agrupados por candidato
RETURN u.email AS email,
       u.nombre AS nombre,
       collect({
           habilidad: h.nombre,
           nivel_usuario: th.nivel,
           anios_experiencia: th.anios_experiencia,
           prioridad_proyecto: r.prioridad,
           anios_requeridos: r.años_experiencia
       }) AS habilidades_coincidentes,
       collect(DISTINCT d.tipo_disponibilidad) AS modalidades_disponibles;