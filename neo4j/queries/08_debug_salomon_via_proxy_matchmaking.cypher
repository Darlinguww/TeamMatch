// Diagnóstico: Salomón vs Via Proxy (1% sugerencias vs 100% dashboard)
// IDs reales del grafo (mayo 2026)
:param salomonId => '4ad19e9d-8079-4aa6-ad7d-e8c9c2e08d7';
:param viaProxyId => '16e90b4d-2832-413b-8e0e-151ca38f6d6a';

// ── A) Perfil vs experiencia (el backend solo usa experiencia) ──
MATCH (u:Usuario {userId: $salomonId})
OPTIONAL MATCH (u)-[:TIENE_HABILIDAD]->(h:Habilidad)
OPTIONAL MATCH (u)-[:TIENE_EXPERIENCIA_EN]->(exp:Habilidad)
RETURN u.email AS email,
       collect(DISTINCT h.name) AS skills_perfil_TIENE_HABILIDAD,
       collect(DISTINCT exp.name) AS skills_experiencia_TIENE_EXPERIENCIA_EN,
       size(collect(DISTINCT h)) AS n_skills_perfil,
       size(collect(DISTINCT exp)) AS n_skills_experiencia;

// ── B) Qué exige Via Proxy ──
MATCH (p:Proyecto {projectId: $viaProxyId})
OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)-[:REQUIERE]->(req:Habilidad)
RETURN p.title AS proyecto,
       r.name AS rol,
       req.name AS habilidad_requerida,
       coalesce(req.normalizedName, toLower(req.name)) AS skill_key;

// ── C) ¿Experiencia de Salomón cubre React (matchmaking backend)? ──
MATCH (u:Usuario {userId: $salomonId})
MATCH (p:Proyecto {projectId: $viaProxyId})
MATCH (p)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(req:Habilidad)
OPTIONAL MATCH (u)-[:TIENE_EXPERIENCIA_EN]->(exp:Habilidad)
WHERE coalesce(exp.normalizedName, toLower(exp.name))
    = coalesce(req.normalizedName, toLower(req.name))
RETURN req.name AS requiere,
       collect(DISTINCT exp.name) AS experiencia_que_cuenta,
       CASE WHEN count(exp) > 0 THEN 'SÍ — debería subir score skills' ELSE 'NO — explica ~0% skills' END AS encaja_matchmaking;

// ── D) ¿Perfil TIENE_HABILIDAD cubre React (lo que usa el dashboard)? ──
MATCH (u:Usuario {userId: $salomonId})
MATCH (p:Proyecto {projectId: $viaProxyId})
MATCH (p)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(req:Habilidad)
OPTIONAL MATCH (u)-[:TIENE_HABILIDAD]->(h:Habilidad)
WHERE coalesce(h.normalizedName, toLower(h.name))
    = coalesce(req.normalizedName, toLower(req.name))
RETURN req.name AS requiere,
       collect(DISTINCT h.name) AS perfil_que_cuenta,
       CASE WHEN count(h) > 0 THEN 'SÍ — explica 100% en dashboard' ELSE 'NO' END AS encaja_dashboard;

// ── E) Disponibilidad (25% del score en UI de sugerencias) ──
MATCH (u:Usuario {userId: $salomonId})
OPTIONAL MATCH (u)-[:DISPONIBLE_EN]->(d:Disponibilidad)
RETURN collect({
  day: d.day,
  start: d.start,
  end: d.end
}) AS slots_disponibilidad,
       CASE WHEN count(d) > 0 THEN 'tiene slots' ELSE 'sin slots — explica 0% disponibilidad' END AS estado;

// ── F) Resumen diagnóstico en una fila ──
MATCH (u:Usuario {userId: $salomonId})
MATCH (p:Proyecto {projectId: $viaProxyId})
OPTIONAL MATCH (p)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(req:Habilidad)
OPTIONAL MATCH (u)-[:TIENE_HABILIDAD]->(h:Habilidad)
WHERE req IS NULL OR coalesce(h.normalizedName, toLower(h.name)) = coalesce(req.normalizedName, toLower(req.name))
OPTIONAL MATCH (u)-[:TIENE_EXPERIENCIA_EN]->(exp:Habilidad)
WHERE req IS NULL OR coalesce(exp.normalizedName, toLower(exp.name)) = coalesce(req.normalizedName, toLower(req.name))
OPTIONAL MATCH (u)-[:DISPONIBLE_EN]->(d:Disponibilidad)
WITH u, p, req,
     count(DISTINCT h) > 0 AS dashboard_ok,
     count(DISTINCT exp) > 0 AS backend_skills_ok,
     count(DISTINCT d) > 0 AS tiene_disponibilidad
RETURN u.email AS usuario,
       p.title AS proyecto,
       req.name AS skill_requerida,
       dashboard_ok AS dashboard_100_si_true,
       backend_skills_ok AS matchmaking_skills_si_true,
       tiene_disponibilidad,
       CASE
         WHEN dashboard_ok AND NOT backend_skills_ok
         THEN 'CONFIRMADO: React en perfil pero no en experiencia → 100% dashboard vs ~1% sugerencias'
         WHEN dashboard_ok AND backend_skills_ok
         THEN 'Datos OK; revisar API / pesos de matchmaking'
         ELSE 'Sin React en perfil ni experiencia; revisar guardado de perfil'
       END AS diagnostico;
