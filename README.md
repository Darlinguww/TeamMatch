# TeamMatch 🤝
**Plataforma de matchmaking inteligente para equipos de trabajo**
 
Universidad del Norte — Diseño de Software I · 2026
 
---
 
## Integrantes
 
| Nombre | Rol | GitHub |
|--------|-----|--------|
| Darlen Cecilia Arias Alemán | DevOps + Lead Developer | @Darlinguww |
| Andrea Carolina de la Ossa Gelves | Frontend Engineering | @adela088 |
| Daniel Eduardo Cera Moran | Database Administration (DBA) | @Danielit707 |
| Nicolas Pérez Padilla | QA & Testing + SCRUM Master | @npzzzp |
| Jhosep Varela Regalado | Backend Engineering | @JVarelaR |
| Iván Rueda | Backend Engineering | @Ivanrued |
 
---
 
## Índice
 
1. [Descripción del proyecto](#descripción)
2. [Stack tecnológico](#stack)
3. [Prerequisitos](#prerequisitos)
4. [Setup inicial](#setup-inicial)
5. [Estructura del repositorio](#estructura)
6. [Variables de entorno](#variables-de-entorno)
7. [Servicios y puertos](#servicios-y-puertos)
8. [Flujo de trabajo en Git](#flujo-de-trabajo-en-git)
9. [Comandos útiles](#comandos-útiles)
10. [Pipeline CI](#pipeline-ci)
---
 
## Descripción
 
TeamMatch es una plataforma que automatiza la formación de equipos de trabajo mediante:
- Procesamiento de habilidades y matchmaking con **Azure OpenAI** (microservicio `ai-service`)
- Motor de emparejamiento con **Neo4j Graph Data Science**
- Score de afinidad ponderado: 60% habilidades · 20% disponibilidad · 20% reputación
---
 
## Stack
 
| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js 20 + Express + TypeScript |
| AI Service | Node.js 20 + Azure OpenAI (OpenAI SDK) |
| Base de datos | Neo4j 5.26 + Graph Data Science (GDS) |
| Contenedores | Docker + Docker Compose |
| Control de versiones | GitHub |
| Gestión de tareas | Jira |
| Diseño UI | Figma |
| Diagramas | Enterprise Architect |
 
---
 
## Prerequisitos
 
Antes de comenzar, asegúrate de tener instalado:
 
- **Docker Desktop** ≥ 24.x → [Descargar](https://docs.docker.com/get-docker/)
- **Node.js** 20 LTS → [Descargar](https://nodejs.org/) *(solo para desarrollo fuera de Docker)*
- **Git** ≥ 2.40
- **VS Code** con las extensiones recomendadas (ver `.vscode/extensions.json`)
> **Nota para Windows:** Activa WSL2 en Docker Desktop para mejor rendimiento.
 
---
 
## Setup Inicial
 
### Opción A — Script automático (recomendado)
 
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/teammatch.git
cd teammatch
 
# 2. Ejecutar el script de setup
bash scripts/setup.sh
```
 
El script verifica los prerequisitos, crea el `.env`, levanta los contenedores y espera a que Neo4j esté listo.
 
---
 
### Opción B — Manual paso a paso
 
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/teammatch.git
cd teammatch
 
# 2. Crear el archivo de variables de entorno
cp .env.example .env
```
 
Abre el archivo `.env` (después de `cp .env.example .env`) y completa al menos:

| Variable | Uso |
|----------|-----|
| `JWT_SECRET` | Obligatorio — firma de tokens |
| `NEO4J_PASSWORD` | Obligatorio — misma clave que usará el contenedor Neo4j |
| `AZURE_OPENAI_*` | Opcional para arrancar contenedores; **necesario** para extracción/matchmaking reales en `ai-service` |

En la raíz del repo:

```powershell
# 1. Variables de entorno (Windows / PowerShell)
Copy-Item .env.example .env
# Edita .env: JWT_SECRET, NEO4J_PASSWORD, y credenciales Azure si usarás IA real.
```

Valores de ejemplo (solo desarrollo):

```bash
JWT_SECRET=<genera con: openssl rand -hex 64>
NEO4J_PASSWORD=<contraseña segura, mín. 8 caracteres>
AZURE_OPENAI_ENDPOINT=https://<recurso>.openai.azure.com/
AZURE_OPENAI_API_KEY=<clave>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

```powershell
# 3. Levantar el stack completo (desde la raíz del repo)
docker compose up -d --build

# 4. Verificar contenedores (Neo4j puede tardar varios minutos en healthy)
docker compose ps

# 5. Abrir la app en el navegador
Start-Process "http://localhost:5173"
```

Solo infraestructura (sin frontend/backend/IA):

```powershell
docker compose up -d neo4j
```

**Perfil de desarrollo:** `docker-compose.override.yml` se fusiona automáticamente con `docker-compose.yml` y activa hot-reload (`npm run dev`) en `backend` y `ai-service`, monta el código fuente y usa volúmenes de `node_modules`. No hace falta `--profile`: basta `docker compose up`.

Deberías ver los 4 contenedores en estado `running`:
 
```
NAME                    STATUS
teammatch-frontend      running
teammatch-backend       running
teammatch-ai            running
teammatch-neo4j         running (healthy)
```
 
---
 
## Estructura del Repositorio
 
```
teammatch/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # Pipeline CI (lint + build + tests)
│   └── pull_request_template.md   # Template obligatorio para PRs
│
├── frontend/                      # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/                 # Vistas principales
│   │   ├── components/            # Componentes reutilizables
│   │   ├── hooks/                 # Custom hooks
│   │   ├── services/              # Llamadas a la API REST
│   │   ├── store/                 # Estado global
│   │   └── types/                 # Tipos TypeScript compartidos
│   └── Dockerfile
│
├── backend/                       # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── modules/               # Un directorio por módulo (auth, profile, etc.)
│   │   ├── shared/                # Middleware, DTOs, utils
│   │   └── database/              # Conexión Neo4j y queries Cypher
│   └── Dockerfile
│
├── ai-service/                    # Microservicio Azure OpenAI (skills + matchmaking)
│   ├── src/
│   │   ├── services/              # Extracción, disponibilidad, motor de propuestas
│   │   └── ...
│   └── Dockerfile
│
├── neo4j/
│   └── init/                      # Scripts Cypher de inicialización del grafo
│
├── scripts/
│   └── setup.sh                   # Script de setup inicial
│
├── docker-compose.yml             # Configuración de los 4 servicios
├── docker-compose.override.yml    # Overrides para desarrollo local
├── .env.example                   # Plantilla de variables de entorno
├── .gitignore
└── README.md
|__ Documentation
     |_Contrato.pdf
```
 
---
 
## Variables de Entorno
 
Todas las variables están documentadas en `.env.example`.
 
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `JWT_SECRET` | Secreto para firmar tokens JWT | `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `24h` |
| `NEO4J_URI` | URI de conexión a Neo4j | `bolt://neo4j:7687` |
| `NEO4J_USER` | Usuario de Neo4j | `neo4j` |
| `NEO4J_PASSWORD` | Contraseña de Neo4j | mínimo 8 caracteres |
| `AZURE_OPENAI_ENDPOINT` | Endpoint del recurso Azure OpenAI | `https://<recurso>.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | API key de Azure OpenAI | portal Azure |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Nombre del deployment | `gpt-4.1-mini` |
| `AZURE_OPENAI_API_VERSION` | Versión de la API | `2025-04-01-preview` |
| `AI_SERVICE_URL` | URL interna del microservicio AI (red Docker) | `http://ai-service:3001` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo de archivos subidos | `5` |
| `PROCESSING_TIMEOUT_MS` | Timeout del procesamiento AI | `30000` |
| `MAX_LOGIN_ATTEMPTS` | Intentos antes de bloqueo | `4` |
| `VITE_API_URL` | URL del backend para el frontend | `http://localhost:3000/api` |
 
> ⚠️ **Nunca commitees el archivo `.env`**. Está en el `.gitignore`.
 
---
 
## Servicios y Puertos
 
| Servicio | Puerto local | Descripción |
|----------|-------------|-------------|
| Frontend | http://localhost:5173 | Interfaz de usuario React |
| Backend API | http://localhost:3000/api | API REST Node.js |
| AI Service | http://localhost:3001 | Microservicio Azure OpenAI |
| Neo4j Browser | http://localhost:7474 | UI web de Neo4j |
| Neo4j Bolt | bolt://localhost:7687 | Conexión driver |
 
---
 
## Flujo de Trabajo en Git
 
### Ramas principales
 
| Rama | Propósito | Protegida |
|------|-----------|-----------|
| `main` | Código estable, entregables | ✅ Sí |
| `develop` | Integración continua del equipo | ✅ Sí |
 
### Ramas de trabajo
 
Cada integrante trabaja en ramas propias con esta nomenclatura:
 
```
feature/SCRUM-XXX-descripcion-corta
fix/SCRUM-XXX-descripcion-corta
```
 
**Ejemplos:**
```
feature/SCRUM-48-registro-usuario
feature/SCRUM-56-disponibilidad-horaria
fix/SCRUM-71-validacion-formulario-registro
```
 
### Flujo completo
 
```bash
# 1. Siempre partir desde develop actualizado
git checkout develop
git pull origin develop
 
# 2. Crear tu rama de trabajo
git checkout -b feature/SCRUM-XXX-mi-tarea
 
# 3. Trabajar y hacer commits descriptivos
git add .
git commit -m "feat(auth): implementar endpoint POST /auth/register"
 
# 4. Subir la rama
git push origin feature/SCRUM-XXX-mi-tarea
 
# 5. Abrir Pull Request hacia develop en GitHub
#    - Usa el template que aparece automáticamente
#    - Asigna al menos 1 revisor
#    - Vincula el ticket de Jira
 
# 6. Después de aprobación y merge, eliminar la rama local
git checkout develop
git pull origin develop
git branch -d feature/SCRUM-XXX-mi-tarea
```
 
### Convención de commits
 
```
feat(modulo):     nueva funcionalidad
fix(modulo):      corrección de bug
refactor(modulo): refactor sin cambio de comportamiento
test(modulo):     agregar o modificar tests
docs:             cambios en documentación
chore:            cambios en config, docker, ci
```
 
### Reglas de protección de ramas
 
Las siguientes reglas deben configurarse en GitHub → Settings → Branches:
 
**Para `main` y `develop`:**
- ✅ Require a pull request before merging
- ✅ Require at least 1 approval
- ✅ Require status checks to pass (CI debe pasar)
- ✅ Do not allow bypassing the above settings
---
 
## Comandos Útiles
 
### Docker Compose

```powershell
# Stack completo (recomendado para ver la UI)
docker compose up -d --build
docker compose ps
Start-Process "http://localhost:5173"

# Solo base de datos
docker compose up -d neo4j
```

```bash
# Levantar todos los servicios
docker compose up -d
 
# Levantar y reconstruir imágenes
docker compose up -d --build
 
# Ver estado de los contenedores
docker compose ps
 
# Ver logs en tiempo real
docker compose logs -f
docker compose logs -f backend
docker compose logs -f neo4j
 
# Detener todos los servicios
docker compose down
 
# Detener y eliminar volúmenes (CUIDADO: borra datos de Neo4j)
docker compose down -v
 
# Reiniciar un servicio específico
docker compose restart backend
```
 
### Neo4j
 
```bash
# Abrir shell de Cypher directamente
docker compose exec neo4j cypher-shell -u neo4j -p TU_PASSWORD
 
# Ver logs de Neo4j
docker compose logs -f neo4j
```
 
### Testing (QA)

Documentación detallada: [`docs/qa-test-plan.md`](docs/qa-test-plan.md), [`docs/integration-testing.md`](docs/integration-testing.md).

```bash
# Backend — unit + integration
cd backend && npm install && npm run build && npm test
npm run test:integration   # HTTP / Supertest
npm run test:security      # IDOR + auth guards

# AI service
cd ai-service && npm test

# E2E / integración con Neo4j real (Neo4j en Docker, tests en el host)
cd backend
$env:RUN_E2E_NEO4J="true"
npm run test:neo4j
```

En PowerShell, con Neo4j levantado (`docker compose up -d neo4j`):

```powershell
cd backend
$env:RUN_E2E_NEO4J = "true"
npm run test:neo4j
```

Frontend con API real: `VITE_USE_API_AUTH=true` y `VITE_API_URL` en `.env`.

### Backend y Frontend (dentro del contenedor)
 
```bash
# Ejecutar tests del backend
docker compose exec backend npm run test
 
# Ejecutar lint del backend
docker compose exec backend npm run lint
 
# Instalar nueva dependencia en el backend
docker compose exec backend npm install nombre-paquete
```
 
---
 
## Pipeline CI
 
El pipeline se ejecuta automáticamente en cada Pull Request y push a `develop`/`main`.
 
### Jobs del pipeline
 
| Job | Qué verifica |
|-----|-------------|
| `backend` | Lint ESLint, compilación TypeScript, tests unitarios |
| `frontend` | Lint, build de producción con Vite |
| `ai-service` | Lint, build |
| `docker-compose-check` | Que el `docker-compose.yml` sea sintácticamente válido |
| `ci-passed` | Resumen final — bloquea el merge si algún job falla |
 
### Un PR solo puede mergearse si:
1. ✅ Todos los jobs del CI pasan
2. ✅ Al menos 1 integrante del equipo aprueba la revisión
3. ✅ El template del PR está completo (checklist marcado)
---
 
## Troubleshooting
 
**Neo4j no levanta / healthcheck falla:**
```bash
docker compose logs neo4j
# Si ves errores de memoria, ajusta NEO4J_dbms_memory_heap_max__size en docker-compose.yml
```
 
**El backend no conecta con Neo4j:**
```bash
# Verifica que NEO4J_URI en .env sea bolt://neo4j:7687 (nombre del servicio, no localhost)
```
 
**Hot reload no funciona en Windows:** el override monta el código con `npm run dev`; si Vite/Node no detectan cambios, reinicia el servicio: `docker compose restart frontend`.
 
**Error de permisos en scripts/setup.sh:**
```bash
chmod +x scripts/setup.sh
bash scripts/setup.sh
```
