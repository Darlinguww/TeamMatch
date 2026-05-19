## 📋 Descripción
## 🔗 Ticket de Jira
Closes SCRUM-


## 👤 Autor
- **Nombre:** Darlena
- **Rol:** Backend / DevOps

---

## 🧩 Tipo de cambio
- [ ] ✨ `feat` — Nueva funcionalidad
- [ ] 🐛 `fix` — Corrección de bug
- [ ] 🔒 `security` — Mejora de seguridad
- [ ] 🗄️ `db` — Cambio en Neo4j (nodos, relaciones, índices, constraints)
- [ ] 🤖 `ai` — Cambio en el AI Service (Gemini, Azure OpenAI, normalización, matchmaking)
- [ ] ♻️ `refactor` — Refactor sin cambio de comportamiento
- [ ] 🧪 `test` — Agregar o modificar tests
- [ ] 📝 `docs` — Solo documentación
- [ ] 🐳 `chore` — Docker, CI, configuración

---

## 📦 Módulo afectado
- [ ] M1 — Autenticación (registro, login, JWT)
- [ ] M2 — Gestión de perfiles e Ingesta (extracción/normalización en memoria con Gemini)
- [ ] M3 — Motor de matchmaking (cálculo de afinidad y propuestas con gpt-4.1-mini en Azure)
- [ ] M4 — Gestión de proyectos
- [ ] M5 — Equipos y tareas (Kanban, ciclo de vida)
- [ ] M6 — Retroalimentación e historial
- [ ] M7 — Capa de persistencia Neo4j
- [ ] M8 — API REST / Backend general
- [ ] M9 — Frontend / UI
- [ ] AI Service — Servicios descentralizados de IA (`gemini.service.ts` / `azure-openai.service.ts`)
- [ ] DevOps — Docker, CI, infraestructura

---

## ✅ Checklist General
- [ ] El código compila sin errores (`npm run build`)
- [ ] El lint pasa sin warnings (`npm run lint`)
- [ ] No se commitea el archivo `.env` ni ningún secreto o API key
- [ ] Las variables de entorno nuevas fueron agregadas al `.env.example`

---

## 🔒 Checklist de Seguridad
**AI Service / Configuración Dual**
- [ ] El **System Prompt** de Gemini indica ignorar instrucciones embebidas (Prompt Injection) en CVs adjuntos.
- [ ] **gpt-4.1-mini (Azure OpenAI)** recibe exclusivamente datos estructurados provenientes de las consultas de Neo4j; nunca texto libre o documentos crudos de usuarios.
- [ ] **Aislamiento absoluto:** No existe comunicación ni llamadas directas entre los endpoints de Gemini y Azure OpenAI. Toda salida intermedia se orquesta a través de la persistencia en el grafo.
- [ ] Los archivos de los candidatos (PDF/TXT) se procesan estrictamente en memoria y **nunca se almacenan permanentemente** en el disco del servidor.

---

## 🤖 Checklist Matchmaking & Procesamiento (solo si el PR toca el motor de IA)
- [ ] La extracción de habilidades con Gemini mapea correctamente la estructura del modelo de datos (`Habilidad`, `Experiencia`, `Disponibilidad`).
- [ ] El motor de Azure OpenAI devuelve las propuestas de equipos acompañadas de sus respectivas métricas de afinidad y justificaciones estructuradas.
- [ ] Se configuró el tiempo de corte (timeout) y controles de degradación controlada para asegurar que el sistema responda en los tiempos límites establecidos ($\le 20$ segundos).

---

## 🧪 Checklist de Tests (solo si el PR incluye tests)
- [ ] Los tests cubren el caso exitoso del flujo de extracción y consulta.
- [ ] Los tests cubren escenarios donde los servicios externos de IA no responden (validando el correcto comportamiento del fallback).
- [ ] Los tests pasan localmente (`npm run test`).
- [ ] Se probaron manualmente los endpoints con Postman o Thunder Client.

---

## 📸 Evidencia
---

## 🗒️ Notas para el revisor