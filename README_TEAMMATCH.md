# TeamMatch - Plataforma de Formación Inteligente de Equipos

## Descripción del Proyecto

TeamMatch es una plataforma digital diseñada para facilitar la formación de equipos de trabajo de manera inteligente y eficiente. El sistema permite a los usuarios registrar sus habilidades, experiencia y disponibilidad en lenguaje natural o mediante la carga de documentos (PDF o texto plano), los cuales son procesados automáticamente por un modelo de lenguaje (SLM/LLM) que extrae, normaliza y agrupa dichos componentes.

## Características Principales

### 1. **Registro y Gestión de Perfiles de Usuario**
- Sistema de autenticación con JWT
- Registro de habilidades mediante:
  - **Texto libre en lenguaje natural**: Describe tus habilidades y experiencia con tus propias palabras
  - **Carga de CV (PDF/TXT)**: Sube tu curriculum y la IA extrae automáticamente la información
  - **Entrada manual**: Agrega habilidades una por una con categorías y niveles
- Procesamiento con **modelo LLM/SLM** (simulado con Gemini) que normaliza y agrupa habilidades
- Gestión de disponibilidad horaria y preferencias

### 2. **Motor de Emparejamiento Basado en IA**
- Utiliza un modelo de IA para aplicar reglas de negocio sobre el grafo de datos
- Analiza:
  - Complementariedad de habilidades normalizadas
  - Compatibilidad de disponibilidad horaria
  - Experiencia y roles desempeñados
  - Historial de retroalimentación de proyectos anteriores
- Genera propuestas de equipos con **Score de Afinidad** justificado
- Muestra métricas de:
  - Complementariedad
  - Disponibilidad
  - Experiencia
  - Historial de colaboración

### 3. **Gestión de Proyectos**
- Creación de proyectos con roles y habilidades requeridas
- Definición de requerimientos de equipo
- Filtrado manual de candidatos
- Visualización de Score de Match para cada proyecto

### 4. **Asignación de Roles y Seguimiento de Desempeño**
- Tablero Kanban para gestión de tareas
- Estados de tareas: Pendiente → En Proceso → En Revisión → Completado
- Asignación de tareas a miembros del equipo
- Sistema de revisión y aprobación por el líder del proyecto
- Visualización de progreso individual y por equipo

### 5. **Sistema de Retroalimentación**
- Evaluación mutua entre miembros al finalizar proyectos
- Calificaciones en múltiples dimensiones:
  - Colaboración
  - Comunicación
  - Habilidades técnicas
  - Rating general
- Historial de retroalimentación visible en perfiles
- Los datos se incorporan al motor de matchmaking para mejorar futuras asignaciones

## Arquitectura del Sistema

### Modelo de Datos (Basado en Grafos - Neo4j)

#### Nodos Principales:
- **Usuario**: Información personal, email, contraseña hash
- **Habilidad**: Competencias normalizadas por el LLM
- **Proyecto**: Iniciativas que requieren equipos
- **Tarea**: Actividades asignadas a miembros
- **Experiencia**: Historial laboral y roles desempeñados
- **Disponibilidad**: Franjas horarias y dedicación semanal

#### Relaciones:
- `(:Usuario)-[:TIENE_HABILIDAD {nivel}]->(:Habilidad)`
- `(:Usuario)-[:PERTENECE_A {rol}]->(:Proyecto)`
- `(:Usuario)-[:ASIGNADO_A {fecha_asignacion}]->(:Tarea)`
- `(:Usuario)-[:POSEE_EXPERIENCIA]->(:Experiencia)`
- `(:Usuario)-[:TIENE_DISPONIBILIDAD]->(:Disponibilidad)`
- `(:Proyecto)-[:REQUIERE {prioridad}]->(:Habilidad)`
- `(:Proyecto)-[:CONTIENE]->(:Tarea)`
- `(:Tarea)-[:EVALUO {puntaje, comentario}]->(:Usuario)`
- `(:Experiencia)-[:UTILIZO]->(:Habilidad)`

### Componentes del Sistema

1. **Módulo de Autenticación** (M1)
   - Registro e inicio de sesión
   - Generación y validación de tokens JWT
   - Almacenamiento seguro con bcrypt

2. **Módulo de Gestión de Perfiles** (M2)
   - Gestión de cuentas de usuario
   - **Servicio de Procesamiento IA (LLM/SLM)**:
     - Recibe texto libre o documentos
     - Extrae y normaliza habilidades
     - Identifica experiencia y años por habilidad
     - Parsea disponibilidad horaria expresada en lenguaje natural
   - Persistencia en Neo4j

3. **Motor de Emparejamiento con IA** (M3)
   - Consulta el grafo Neo4j
   - Construye contexto para el modelo de IA
   - Aplica reglas de negocio mediante LLM/SLM
   - Retorna propuestas con scores y justificaciones

4. **Módulo de Gestión de Proyectos** (M4)
   - Creación y configuración de proyectos
   - Definición de roles y habilidades requeridas
   - Búsqueda manual de candidatos

5. **Módulo de Gestión de Equipos y Tareas** (M5)
   - Composición del equipo
   - Asignación y modificación de roles
   - Ciclo de vida de tareas con flujo de aprobación

6. **Módulo de Retroalimentación** (M6)
   - Evaluación mutua post-proyecto
   - Almacenamiento de feedback por perfil
   - Integración con motor de matchmaking

## Stack Tecnológico

### Frontend
- **React + Vite + TypeScript**
- **Tailwind CSS** para estilos
- **React Router** para navegación
- **Lucide React** para iconos

### Backend (Simulado en Frontend)
- Node.js + Express + TypeScript
- Neo4j (base de datos de grafos)
- JWT para autenticación
- bcrypt para hashing de contraseñas

### Servicios de IA
- **API LLM/SLM (Gemini)** para:
  - Procesamiento de habilidades en lenguaje natural
  - Normalización y agrupación de competencias
  - Aplicación de reglas de negocio en matchmaking

### Herramientas de Desarrollo
- **GitHub**: Control de versiones
- **Jira**: Gestión de tareas y sprints
- **Figma**: Diseño de prototipos UI
- **Enterprise Architect**: Diagramas UML
- **Docker**: Contenedores y entornos consistentes
- **VS Code**: IDE principal

## Flujos Principales

### Flujo de Registro de Habilidades con IA

1. Usuario ingresa texto libre o carga documento (PDF/TXT)
2. Frontend envía contenido al backend
3. Backend reenvía al Servicio de Procesamiento LLM/SLM
4. El modelo analiza y extrae:
   - **Habilidades**: Normalizadas y categorizadas (técnicas, blandas, dominio)
   - **Experiencia**: Años y roles desempeñados
   - **Disponibilidad**: Días y franjas horarias
5. Usuario revisa y confirma información extraída
6. Backend persiste en Neo4j como nodos y relaciones

### Flujo del Motor de Matchmaking con IA

1. Líder crea proyecto y define requerimientos
2. Motor ejecuta consultas Cypher en Neo4j para recuperar candidatos
3. Construye contexto con:
   - Perfiles de candidatos (habilidades, experiencia, disponibilidad, feedback)
   - Requerimientos del proyecto
   - Reglas de negocio
4. Envía contexto al modelo de IA (LLM/SLM)
5. Modelo evalúa combinaciones y aplica reglas inteligentemente
6. Retorna propuestas de equipos con scores y justificaciones
7. Frontend presenta propuestas al líder

## Actores del Sistema

### 1. Usuario (Estudiante/Profesional)
- Registra y actualiza perfil
- Visualiza propuestas de equipos
- Gestiona tareas asignadas
- Proporciona retroalimentación

### 2. Sistema de Matchmaking (IA)
- Procesa habilidades con LLM/SLM
- Normaliza y persiste datos en Neo4j
- Aplica reglas de negocio mediante IA
- Genera propuestas de equipos óptimas
- Garantiza integridad de datos

### 3. Proyecto (Entidad)
- Almacena descripción y objetivos
- Define roles requeridos
- Sirve como nodo central de unión

### 4. Líder de Equipo (Rol)
- Define requerimientos de equipo
- Asigna tareas y supervisa progreso
- Valida o rechaza entregas
- Modifica composición del equipo si es necesario

## Requerimientos No Funcionales

- **RNF1**: Motor de IA genera propuestas en ≤ 20 segundos para 100 perfiles
- **RNF2**: Disponibilidad del 99% durante período académico
- **RNF3**: Contraseñas con bcrypt (≥10 rondas), JWT expira en 24h
- **RNF4**: Neo4j soporta 1000 nodos de usuario y 50000 relaciones
- **RNF5**: Usuario completa perfil en ≤ 5 minutos
- **RNF6**: Archivos cargados solo procesados, no almacenados permanentemente

## Instalación y Desarrollo

```bash
# Clonar repositorio
git clone <repo-url>

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Próximos Pasos

- [ ] Integración real con API de Gemini para procesamiento LLM
- [ ] Conexión con Neo4j para persistencia de grafo
- [ ] Implementación de backend Node.js + Express
- [ ] Sistema de autenticación JWT completo
- [ ] Despliegue con Docker Compose
- [ ] Testing automatizado
- [ ] Documentación de API REST

## Equipo del Proyecto

| Nombre | Rol | Código |
|--------|-----|--------|
| Darlen Cecilia Arias Alemán | DevOps y Lead Developer | 200182800 |
| Andrea Carolina de la Ossa Gelves | Frontend Engineering | 200192335 |
| Daniel Eduardo Cera Moran | Database Administration (DBA) | 200195354 |
| Nicolas Pérez Padilla | QA & Testing y SCRUM Master | 200196735 |
| Jhosep Varela Regalado | Backend Engineering | 200198584 |
| Iván Rueda | Backend Engineering | 200182491 |

## Licencia

Este proyecto es parte de la asignatura Diseño de Software I en la Universidad del Norte.

---

**Fecha**: 10 de abril del 2026  
**Docente**: Daniel José Romero Martínez
