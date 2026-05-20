## 📋 Descripción

Integración del pipeline GDS en Neo4j, WebSockets para gestión de tareas con concurrencia optimista (SCRUM-202), frontend React desde `test-frontend` conectado al backend (REST + Socket.io), y correcciones de Docker para levantar el stack completo en local.

**Incluye:**
- Socket.io en backend: `project:join`, `task:updateStatus`, `task:statusUpdated`, control optimista por `version`
- Queries e índices Neo4j (matchmaking SCRUM-167, tareas, normalización)
- App React + Vite en `frontend/` con tablero Kanban en tiempo real para proyectos `prj_*`
- Fix healthcheck Neo4j (`RETURN 1` sin `AS ok`), variables `TEAMMATCH_NEO4J_*`, volumen `ai_service_node_modules`
- Fix build ai-service (imports no usados en matchmaking)

## 🔗 Ticket de Jira

Closes SCRUM-187, SCRUM-202

## 👤 Autor

- **Nombre:** Darlena
- **Rol:** Backend / DevOps

---

## 🧩 Tipo de cambio

- [x] ✨ `feat` — Nueva funcionalidad
- [x] 🐛 `fix` — Corrección de bug
- [ ] 🔒 `security` — Mejora de seguridad
- [x] 🗄️ `db` — Cambio en Neo4j (nodos, relaciones, índices, constraints)
- [ ] 🤖 `ai` — Cambio en el AI Service (Gemini, Azure OpenAI, normalización, matchmaking)
- [ ] ♻️ `refactor` — Refactor sin cambio de comportamiento
- [x] 🧪 `test` — Agregar o modificar tests
- [ ] 📝 `docs` — Solo documentación
- [x] 🐳 `chore` — Docker, CI, configuración

---

## 📦 Módulo afectado

- [x] M1 — Autenticación (registro, login, JWT)
- [ ] M2 — Gestión de perfiles e Ingesta (extracción/normalización en memoria con Gemini)
- [ ] M3 — Motor de matchmaking (cálculo de afinidad y propuestas con gpt-4.1-mini en Azure)
- [x] M4 — Gestión de proyectos
- [x] M5 — Equipos y tareas (Kanban, ciclo de vida)
- [ ] M6 — Retroalimentación e historial
- [x] M7 — Capa de persistencia Neo4j
- [x] M8 — API REST / Backend general
- [x] M9 — Frontend / UI
- [ ] AI Service — Servicios descentralizados de IA (`gemini.service.ts` / `azure-openai.service.ts`)
- [x] DevOps — Docker, CI, infraestructura

---

## ✅ Checklist General

- [x] El código compila sin errores (`npm run build`)
- [x] El lint pasa sin warnings (`npm run lint`)
- [x] No se commitea el archivo `.env` ni ningún secreto o API key
- [ ] Las variables de entorno nuevas fueron agregadas al `.env.example`

---

## 🔒 Checklist de Seguridad

**AI Service / Configuración Dual**

- [ ] El **System Prompt** de Gemini indica ignorar instrucciones embebidas (Prompt Injection) en CVs adjuntos.
- [ ] **gpt-4.1-mini (Azure OpenAI)** recibe exclusivamente datos estructurados provenientes de las consultas de Neo4j; nunca texto libre o documentos crudos de usuarios.
- [ ] **Aislamiento absoluto:** No existe comunicación ni llamadas directas entre los endpoints de Gemini y Azure OpenAI. Toda salida intermedia se orquesta a través de la persistencia en el grafo.
- [ ] Los archivos de los candidatos (PDF/TXT) se procesan estrictamente en memoria y **nunca se almacenan permanentemente** en el disco del servidor.

_Notas: JWT en handshake de Socket.io; CORS en dev. Checklist de IA no aplica a cambios principales de este PR._

---

## 🤖 Checklist Matchmaking & Procesamiento (solo si el PR toca el motor de IA)

- [ ] La extracción de habilidades con Gemini mapea correctamente la estructura del modelo de datos (`Habilidad`, `Experiencia`, `Disponibilidad`).
- [ ] El motor de Azure OpenAI devuelve las propuestas de equipos acompañadas de sus respectivas métricas de afinidad y justificaciones estructuradas.
- [ ] Se configuró el tiempo de corte (timeout) y controles de degradación controlada para asegurar que el sistema responda en los tiempos límites establecidos (≤ 20 segundos).

---

## 🧪 Checklist de Tests (solo si el PR incluye tests)

- [x] Los tests cubren el caso exitoso del flujo de extracción y consulta.
- [ ] Los tests cubren escenarios donde los servicios externos de IA no responden (validando el correcto comportamiento del fallback).
- [x] Los tests pasan localmente (`npm run test`).
- [x] Se probaron manualmente los endpoints con Postman o Thunder Client.

---

## 📸 Evidencia

- Demo: `docker compose up` → http://localhost:5173/projects/prj_001 → tablero Kanban con sincronización en dos navegadores.
- Backend: `GET http://localhost:3000/` → `status: ok`

---

## 🗒️ Notas para el revisor

- Los imports en código TypeScript del backend usan extensión `.js` (convención ESM).
- El modo live del Kanban se activa en rutas `/projects/prj_*` con JWT; proyectos mock (`p1`, etc.) siguen en modo local.
- Primera subida de Neo4j con GDS puede tardar ~2–3 min hasta `healthy`.
