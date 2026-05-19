// =======================================================================
// SCRUM-224: REPUTACIÓN CON DECAY TEMPORAL Y COINCIDENCIA DE DOMINIO
// Algoritmos matemáticos y analítica sobre el Grafo para TeamMatch
// =======================================================================

// -----------------------------------------------------------------------
// 1. REPUTACIÓN AGREGADA CON DECAY TEMPORAL (Fórmula Exponencial)
// -----------------------------------------------------------------------
// Calcula un promedio ponderado de las notas (comunicación, responsabilidad, técnica).
// Aplica e^(-lambda * dias_transcurridos) para penalizar evaluaciones antiguas.
// Parámetros: $emailUsuario, $fechaActual (ej: '2026-05-18'), $lambda (ej: 0.005)
MATCH ()-[e:EVALUO]->(u:Usuario {email: $emailUsuario})

WITH u, e,
     // Calculamos los días transcurridos desde que se hizo la evaluación hasta hoy
     duration.inDays(date(e.fecha_evaluacion), date($fechaActual)).days AS dias,
     // Promedio simple de las tres sub-notas de la co-evaluación
     (e.nota_comunicacion + e.nota_responsabilidad + e.nota_tecnica) / 3.0 AS promedioNota

// Aplicamos la función matemática de decaimiento: peso = exp(-lambda * dias)
WITH u, promedioNota, exp(-$lambda * dias) AS factorDecay

// Calculamos la nota final ponderada por el tiempo
RETURN u.nombre AS candidato,
       u.email AS email,
       count(promedioNota) AS evaluaciones_recibidas,
       sum(promedioNota * factorDecay) / sum(factorDecay) AS reputación_score_temporal
ORDER BY reputación_score_temporal DESC;


// -----------------------------------------------------------------------
// 2. COINCIDENCIA DE DOMINIO TECNOLÓGICO
// -----------------------------------------------------------------------
// Mide la afinidad de un usuario con las áreas maestras de un proyecto
// basándose en cuántas habilidades posee de dicho ecosistema.
// Parámetros: $proyectoId
MATCH (p:Proyecto {proyectoId: $proyectoId})
MATCH (p)-[:REQUIERE]->(hReq:Habilidad)

// Buscamos usuarios que compartan esas mismas habilidades
MATCH (u:Usuario)-[t:TIENE_HABILIDAD]->(hReq)

WITH p, u, count(hReq) AS habilidades_comunes, collect(hReq.nombre) AS detalles_skills
MATCH (p)-[:REQUIERE]->(totalReq:Habilidad)

WITH p, u, habilidades_comunes, detalles_skills, count(totalReq) AS total_proyecto

RETURN u.nombre AS candidato,
       u.email AS email,
       detalles_skills AS tecnologias_compartidas,
       habilidades_comunes AS cantidad_coincidencias,
       toFloat(habilidades_comunes) / total_proyecto AS porcentaje_afinidad_dominio
ORDER BY porcentaje_afinidad_dominio DESC;