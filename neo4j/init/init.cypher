// =========================================================================
// SCRIPT DE INICIALIZACIÓN AUTOMÁTICA - TEAMMATCH (50 USUARIOS Y PROYECTOS)
// =========================================================================

// 1. CREACIÓN DE HABILIDADES POR ÁREA (Taxonomía Base)
// -------------------------------------------------------------------------
UNWIND [
  {n: 'Python', t: true}, {n: 'React', t: true}, {n: 'TypeScript', t: true}, {n: 'Neo4j', t: true}, {n: 'Docker', t: true},
  {n: 'Primeros Auxilios', t: false}, {n: 'Anatomía Clínica', t: true}, {n: 'Farmacología', t: true}, {n: 'Sutura', t: true}, {n: 'Diagnóstico Médico', t: true},
  {n: 'Adobe Photoshop', t: true}, {n: 'Diseño de Interfaz (UI)', t: true}, {n: 'Branding', t: true}, {n: 'Ilustración Digital', t: true}, {n: 'Figma', t: true},
  {n: 'Gestión de Operaciones', t: true}, {n: 'Optimización de Procesos', t: true}, {n: 'Six Sigma', t: true}, {n: 'Logística', t: true}, {n: 'AutoCAD', t: true},
  {n: 'Evaluación Psicológica', t: true}, {n: 'Terapia Cognitivo-Conductual', t: true}, {n: 'Empatía', t: false}, {n: 'Resolución de Conflictos', t: false}, {n: 'Psicología Organizacional', t: true},
  {n: 'Estrategia de Mercado', t: true}, {n: 'Finanzas Corporativas', t: true}, {n: 'Negociación', t: false}, {n: 'Análisis de Datos', t: true}, {n: 'Excel Avanzado', t: true},
  {n: 'Liderazgo', t: false}, {n: 'Trabajo en Equipo', t: false}, {n: 'Comunicación Asertiva', t: false}, {n: 'Pensamiento Crítico', t: false}
] AS skill
MERGE (s:Skill {nombre: skill.n})
SET s.es_tecnica = skill.t;

// 2. CREACIÓN DE 50 USUARIOS Y PROYECTOS MULTIDISCIPLINARES
// -------------------------------------------------------------------------
UNWIND [
  // --- INGENIERÍA DE SISTEMAS / DESARROLLO ---
  {id: 'U1', nom: 'Daniel', em: 'daniel@uninorte.edu.co', pId: 'P1', pNom: 'Algoritmo Optimizado de Matchmaking', pDesc: 'Motor de grafos para emparejamiento laboral usando coeficientes de coincidencia estructural.', sk: ['Neo4j', 'TypeScript', 'Docker', 'Liderazgo']},
  {id: 'U2', nom: 'Jhosep', em: 'jhosep@uninorte.edu.co', pId: 'P2', pNom: 'Plataforma de Microservicios Distribuidos', pDesc: 'Arquitectura escalable en Node.js para procesamiento asíncrono.', sk: ['TypeScript', 'Docker', 'Python', 'Trabajo en Equipo']},
  {id: 'U3', nom: 'Iván', em: 'ivan@uninorte.edu.co', pId: 'P3', pNom: 'Ecosistema Frontend React Core', pDesc: 'Interfaz SPA modularizada y reactiva con gestión de estado global optimizada.', sk: ['React', 'TypeScript', 'Figma', 'Pensamiento Crítico']},
  {id: 'U4', nom: 'Mateo Andrés', em: 'mateoa@uninorte.edu.co', pId: 'P4', pNom: 'Análisis Predictivo de Datos Climáticos', pDesc: 'Modelado analítico con Python para predicción de precipitaciones.', sk: ['Python', 'Análisis de Datos', 'Excel Avanzado']},
  {id: 'U5', nom: 'Carlos Mendoza', em: 'carlosm@uninorte.edu.co', pId: 'P5', pNom: 'API Gateway de Autenticación Centralizada', pDesc: 'Servicio seguro perimetral basado en JWT y cookies seguras.', sk: ['TypeScript', 'Docker', 'Pensamiento Crítico']},
  {id: 'U6', nom: 'Sofía Villa', em: 'svilla@uninorte.edu.co', pId: 'P6', pNom: 'Trazabilidad de Datos con Blockchain', pDesc: 'Sistema distribuido para seguridad de historiales académicos.', sk: ['Python', 'Neo4j', 'Resolución de Conflictos']},
  {id: 'U7', nom: 'Andrés Bornacelly', em: 'abornacelly@uninorte.edu.co', pId: 'P7', pNom: 'Herramienta de Automatización de Testing', pDesc: 'Suite de pruebas de integración continua automatizadas.', sk: ['TypeScript', 'Python', 'Trabajo en Equipo']},
  {id: 'U8', nom: 'Elena Rostova', em: 'erostova@uninorte.edu.co', pId: 'P8', pNom: 'Visualizador de Grafos de Conocimiento', pDesc: 'Herramienta interactiva para mapeo de mallas curriculares.', sk: ['React', 'Neo4j', 'Diseño de Interfaz (UI)']},

  // --- MEDICINA Y SALUD ---
  {id: 'U9', nom: 'Dra. María Camila', em: 'mcamila@uninorte.edu.co', pId: 'P9', pNom: 'Brigada de Salud Rural Atlántico', pDesc: 'Logística y atención médica preventiva en comunidades vulnerables del departamento.', sk: ['Diagnóstico Médico', 'Primeros Auxilios', 'Liderazgo', 'Empatía']},
  {id: 'U10', nom: 'Juan Sebastián', em: 'jsebastian@uninorte.edu.co', pId: 'P10', pNom: 'Simulador de Suturas de Alta Precisión', pDesc: 'Taller práctico con modelos sintéticos para estudiantes de pregrado.', sk: ['Sutura', 'Anatomía Clínica', 'Trabajo en Equipo']},
  {id: 'U11', nom: 'Gabriela Gómez', em: 'ggomez@uninorte.edu.co', pId: 'P11', pNom: 'Manual de Interacciones Farmacológicas', pDesc: 'Compendio digital explicativo sobre contraindicaciones severas.', sk: ['Farmacología', 'Diagnóstico Médico', 'Pensamiento Crítico']},
  {id: 'U12', nom: 'Ricardo Luna', em: 'rluna@uninorte.edu.co', pId: 'P12', pNom: 'Estudio Epidemiológico de Dengue Urbano', pDesc: 'Recolección de muestras de campo y mapeo de zonas de contagio masivo.', sk: ['Diagnóstico Médico', 'Análisis de Datos', 'Excel Avanzado']},
  {id: 'U13', nom: 'Valeria Solano', em: 'vsolano@uninorte.edu.co', pId: 'P13', pNom: 'Protocolo de Urgencias Pediátricas', pDesc: 'Guía rápida de toma de decisiones en triaje clínico infantil.', sk: ['Primeros Auxilios', 'Diagnóstico Médico', 'Comunicación Asertiva']},
  {id: 'U14', nom: 'Dr. Alejandro Mafra', em: 'amafra@uninorte.edu.co', pId: 'P14', pNom: 'Seminario de Avances Cardiológicos', pDesc: 'Simposio con cirujanos internacionales sobre prótesis valvulares.', sk: ['Anatomía Clínica', 'Liderazgo', 'Comunicación Asertiva']},
  {id: 'U15', nom: 'Mariana Pineda', em: 'mpineda@uninorte.edu.co', pId: 'P15', pNom: 'Campaña de Donación de Sangre Uninorte', pDesc: 'Estrategia de concienciación y recolección masiva en campus.', sk: ['Primeros Auxilios', 'Empatía', 'Trabajo en Equipo']},
  {id: 'U16', nom: 'Laura Cadena', em: 'lcadena@uninorte.edu.co', pId: 'P16', pNom: 'Estudio Clínico de Resistencia Antimicrobiana', pDesc: 'Análisis microbiológico de cepas bacterianas hospitalarias.', sk: ['Farmacología', 'Análisis de Datos', 'Pensamiento Crítico']},

  // --- DISEÑO GRÁFICO / UI / UX ---
  {id: 'U17', nom: 'Santiago Cruz', em: 'scruz@uninorte.edu.co', pId: 'P17', pNom: 'Identidad Visual Marca Región Caribe', pDesc: 'Rediseño iconográfico y paleta cromática basada en el folklore local.', sk: ['Branding', 'Adobe Photoshop', 'Ilustración Digital']},
  {id: 'U18', nom: 'Camila Terán', em: 'cteran@uninorte.edu.co', pId: 'P18', pNom: 'Rediseño de Interfaz App Transmetro', pDesc: 'Prototipo UX/UI enfocado en mejorar la accesibilidad de la tercera edad.', sk: ['Diseño de Interfaz (UI)', 'Figma', 'Empatía', 'Pensamiento Crítico']},
  {id: 'U19', nom: 'Nicolás Duarte', em: 'nduarte@uninorte.edu.co', pId: 'P19', pNom: 'Cortometraje Animado Institucional', pDesc: 'Storyboarding y animación digital en 2D para campañas internas.', sk: ['Ilustración Digital', 'Adobe Photoshop', 'Trabajo en Equipo']},
  {id: 'U20', nom: 'Paula Abello', em: 'pabello@uninorte.edu.co', pId: 'P20', pNom: 'Sistema de Señalética Universitaria', pDesc: 'Diseño estructural de mapas y señales visuales para Bloque K y Bloque L.', sk: ['Branding', 'Diseño de Interfaz (UI)', 'Comunicación Asertiva']},
  {id: 'U21', nom: 'Mateo Silvestre', em: 'msilvestre@uninorte.edu.co', pId: 'P21', pNom: 'Revista Digital Nexos Creativos', pDesc: 'Diagramación editorial interactiva para publicación semestral.', sk: ['Adobe Photoshop', 'Figma', 'Resolución de Conflictos']},
  {id: 'U22', nom: 'Natalia Restrepo', em: 'nrestrepo@uninorte.edu.co', pId: 'P22', pNom: 'Diseño UX para Dashboard Médico', pDesc: 'Optimización visual del flujo de lectura de exámenes de laboratorio.', sk: ['Diseño de Interfaz (UI)', 'Figma', 'Anatomía Clínica']},
  {id: 'U23', nom: 'Julián Ortega', em: 'jortega@uninorte.edu.co', pId: 'P23', pNom: 'Packaging Sustentable para Café Local', pDesc: 'Modelado y diseño de empaques biodegradables con identidad de marca.', sk: ['Branding', 'Ilustración Digital', 'Liderazgo']},

  // --- INGENIERÍA INDUSTRIAL / OPERACIONES ---
  {id: 'U24', nom: 'Ing. Fernando Jorge', em: 'fjorge@uninorte.edu.co', pId: 'P24', pNom: 'Rediseño de Planta de Manufactura Barranquilla', pDesc: 'Reorganización de maquinaria pesada para mitigar cuellos de botella.', sk: ['Gestión de Operaciones', 'AutoCAD', 'Six Sigma', 'Liderazgo']},
  {id: 'U25', nom: 'Diana Carolina', em: 'dcarolina@uninorte.edu.co', pId: 'P25', pNom: 'Plan de Logística Verde para Despachos', pDesc: 'Optimización de rutas de transporte de carga pesada reduciendo huella de carbono.', sk: ['Logística', 'Optimización de Procesos', 'Excel Avanzado']},
  {id: 'U26', nom: 'Héctor Lavalle', em: 'hlavalle@uninorte.edu.co', pId: 'P26', pNom: 'Estandarización bajo Metodología 5S', pDesc: 'Manual de despliegue operacional para bodegas de almacenamiento.', sk: ['Optimización de Procesos', 'Six Sigma', 'Trabajo en Equipo']},
  {id: 'U27', nom: 'Silvia Dangond', em: 'sdangond@uninorte.edu.co', pId: 'P27', pNom: 'Modelado 3D de Infraestructura Hidráulica', pDesc: 'Planos técnicos estructurales de tuberías de refrigeración industrial.', sk: ['AutoCAD', 'Gestión de Operaciones', 'Pensamiento Crítico']},
  {id: 'U28', nom: 'Leonardo Fabio', em: 'lfabio@uninorte.edu.co', pId: 'P28', pNom: 'Estudio de Tiempos y Movimientos en Maquila', pDesc: 'Cálculo de eficiencia de operarios en líneas de ensamble de calzado.', sk: ['Six Sigma', 'Optimización de Procesos', 'Análisis de Datos']},
  {id: 'U29', nom: 'Angélica Meza', em: 'ameza@uninorte.edu.co', pId: 'P29', pNom: 'Auditoría de Control de Calidad de Empaques', pDesc: 'Muestreo estadístico para control de mermas en empaques plásticos.', sk: ['Six Sigma', 'Excel Avanzado', 'Resolución de Conflictos']},
  {id: 'U30', nom: 'Jorge Senior', em: 'jsenior@uninorte.edu.co', pId: 'P30', pNom: 'Rediseño de Cadena de Suministro Farmacéutica', pDesc: 'Modelo de inventario Just-In-Time para medicamentos de alta demanda.', sk: ['Logística', 'Gestión de Operaciones', 'Análisis de Datos']},

  // --- PSICOLOGÍA / RECURSOS HUMANOS ---
  {id: 'U31', nom: 'Dra. Andrea Martínez', em: 'amartinez@uninorte.edu.co', pId: 'P31', pNom: 'Programa de Prevención del Burnout Universitario', pDesc: 'Talleres de manejo de estrés para estudiantes en semanas de parciales.', sk: ['Terapia Cognitivo-Conductual', 'Empatía', 'Liderazgo', 'Comunicación Asertiva']},
  {id: 'U32', nom: 'Camilo Noguera', em: 'cnoguera@uninorte.edu.co', pId: 'P32', pNom: 'Plan de Clima Organizacional en Startup', pDesc: 'Evaluación y estructuración de incentivos de retención de talento humano.', sk: ['Psicología Organizacional', 'Evaluación Psicológica', 'Resolución de Conflictos']},
  {id: 'U33', nom: 'Isabella Char', em: 'ichar@uninorte.edu.co', pId: 'P33', pNom: 'Batería de Pruebas Psicométricas Automatizadas', pDesc: 'Estandarización de test proyectivos aplicados al reclutamiento industrial.', sk: ['Evaluación Psicológica', 'Excel Avanzado', 'Trabajo en Equipo']},
  {id: 'U34', nom: 'Felipe Senior', em: 'fsenior@uninorte.edu.co', pId: 'P34', pNom: 'Grupo de Apoyo Manejo del Duelo', pDesc: 'Sesiones de contención psicológica grupal orientadas a adultos mayores.', sk: ['Terapia Cognitivo-Conductual', 'Empatía', 'Comunicación Asertiva']},
  {id: 'U35', nom: 'Lina Maestre', em: 'lmaestre@uninorte.edu.co', pId: 'P35', pNom: 'Taller de Mediación en Ambientes Escolares', pDesc: 'Capacitación docente para resolución pacífica de acoso escolar.', sk: ['Resolución de Conflictos', 'Comunicación Asertiva', 'Empatía']},
  {id: 'U36', nom: 'David Beckham', em: 'dbeckham@uninorte.edu.co', pId: 'P36', pNom: 'Estudio Psicosocial del Impacto de Redes Sociales', pDesc: 'Encuesta cuantitativa sobre ansiedad social en adolescentes de colegios públicos.', sk: ['Evaluación Psicológica', 'Análisis de Datos', 'Pensamiento Crítico']},
  {id: 'U37', nom: 'Clara Inés', em: 'cines@uninorte.edu.co', pId: 'P37', pNom: 'Plan de Inclusión Laboral Diversa', pDesc: 'Manual técnico corporativo para inducción de personas con discapacidad.', sk: ['Psicología Organizacional', 'Empatía', 'Trabajo en Equipo']},

  // --- ADMINISTRACIÓN / NEGOCIOS / MARKETING ---
  {id: 'U38', nom: 'Roberto Castro', em: 'rcastro@uninorte.edu.co', pId: 'P38', pNom: 'Estrategia de Go-To-Market FinTech Local', pDesc: 'Lanzamiento de una billetera digital enfocada en tenderos locales.', sk: ['Estrategia de Mercado', 'Negociación', 'Liderazgo']},
  {id: 'U39', nom: 'Vanessa Vergara', em: 'vvergara@uninorte.edu.co', pId: 'P39', pNom: 'Modelo de Valoración Financiera de Franquicias', pDesc: 'Proyecciones de flujo de caja libre descontado a 5 años de franquicias de comida.', sk: ['Finanzas Corporativas', 'Excel Avanzado', 'Análisis de Datos']},
  {id: 'U40', nom: 'Guillermo Coppola', em: 'gcoppola@uninorte.edu.co', pId: 'P40', pNom: 'Plan de Internacionalización de Artesanías', pDesc: 'Estudio de aranceles y viabilidad logística para exportación a la Unión Europea.', sk: ['Negociación', 'Estrategia de Mercado', 'Comunicación Asertiva']},
  {id: 'U41', nom: 'Adriana Lucía', em: 'alucia@uninorte.edu.co', pId: 'P41', pNom: 'Auditoría de Costos Ocultos en Hotelería', pDesc: 'Estrategia de reducción de costos operativos hoteleros en temporada baja.', sk: ['Finanzas Corporativas', 'Excel Avanzado', 'Optimización de Procesos']},
  {id: 'U42', nom: 'Mauricio Macri', em: 'mmacri@uninorte.edu.co', pId: 'P42', pNom: 'Estrategia de Reposicionamiento de Marca', pDesc: 'Campaña publicitaria omnicanal para revitalizar una marca tradicional de ropa.', sk: ['Estrategia de Mercado', 'Branding', 'Trabajo en Equipo']},
  {id: 'U43', nom: 'Tatiana Calderón', em: 'tcalderon@uninorte.edu.co', pId: 'P43', pNom: 'Simulación de Rueda de Negocios de Comercio', pDesc: 'Evento académico interuniversitario para negociación de TLC ficticios.', sk: ['Negociación', 'Comunicación Asertiva', 'Liderazgo']},
  {id: 'U44', nom: 'Esteban Quito', em: 'equito@uninorte.edu.co', pId: 'P44', pNom: 'Plan de Negocio: Agencia de Contenido Digital', pDesc: 'Estructuración de costos, tarifas y plan comercial para agencia boutique.', sk: ['Estrategia de Mercado', 'Finanzas Corporativas', 'Resolución de Conflictos']},

  // --- MIXTOS / INTERDISCIPLINARIOS ---
  {id: 'U45', nom: 'Juancho Rois', em: 'jrois@uninorte.edu.co', pId: 'P45', pNom: 'Festival Cultural de Música en Campus', pDesc: 'Producción general, logística y contratación de eventos artísticos.', sk: ['Liderazgo', 'Negociación', 'Trabajo en Equipo']},
  {id: 'U46', nom: 'Sergio Ramos', em: 'sramos@uninorte.edu.co', pId: 'P46', pNom: 'Plan de Gestión de Residuos en Laboratorios', pDesc: 'Protocolo de descarte seguro de materiales biológicos y reactivos químicos.', sk: ['Optimización de Procesos', 'Primeros Auxilios', 'Pensamiento Crítico']},
  {id: 'U47', nom: 'Gabriela Sabatini', em: 'gsabatini@uninorte.edu.co', pId: 'P47', pNom: 'Análisis de Clima Deportivo Universitario', pDesc: 'Estudio psicológico sobre el rendimiento de atletas de alta competencia.', sk: ['Evaluación Psicológica', 'Análisis de Datos', 'Trabajo en Equipo']},
  {id: 'U48', nom: 'Karim Benzema', em: 'kbenzema@uninorte.edu.co', pId: 'P48', pNom: 'E-Commerce de Suministros Clínicos', pDesc: 'Modelado comercial y logístico para distribución B2B de insumos hospitalarios.', sk: ['Estrategia de Mercado', 'Logística', 'Excel Avanzado']},
  {id: 'U49', nom: 'Luka Modric', em: 'lmodric@uninorte.edu.co', pId: 'P49', pNom: 'Branding para Startup de Telemedicina', pDesc: 'Conceptualización marcaria completa para aplicación de citas médicas virtuales.', sk: ['Branding', 'Figma', 'Diseño de Interfaz (UI)']},
  {id: 'U50', nom: 'Kylian Mbappé', em: 'kmbappe@uninorte.edu.co', pId: 'P50', pNom: 'Dashboard Operacional de Logística Portuaria', pDesc: 'Cuadro de mando analítico para rastreo de contenedores de carga internacional.', sk: ['Excel Avanzado', 'Análisis de Datos', 'Logística', 'Pensamiento Crítico']}
] AS data

// Ejecución de inserción robusta (Evita duplicados ante reinicios de Docker con MERGE)
MERGE (u:Usuario {email: data.em})
ON CREATE SET u.userId = data.id, u.nombre = data.nom

MERGE (p:Proyecto {proyectoId: data.pId})
ON CREATE SET p.nombre = data.pNom, p.descripcion = data.pDesc

// El creador es automáticamente asignado con el Rol estructural de Líder
MERGE (u)-[r:PERTENECE_A]->(p)
ON CREATE SET r.rol = 'Líder'

// Conexión dinámica con los nodos de Habilidades previamente creados
WITH u, p, data
MATCH (s:Skill) WHERE s.nombre IN data.sk
MERGE (u)-[:TIENE_HABILIDAD]->(s);