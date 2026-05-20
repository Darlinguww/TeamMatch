## 📋 Descripción
<!-- Explica qué hace este PR en 2-3 líneas. Qué problema resuelve o qué funcionalidad agrega? -->
 
## 🔗 Ticket de Jira
<!-- Escribe el número exacto del ticket. Esto cierra automáticamente la tarea en Jira al hacer merge -->
Closes SCRUM-
 
## 👤 Autor
<!-- Tu nombre y rol -->
- **Nombre:**
- **Rol:** <!-- DevOps / Frontend / Backend / DBA / QA -->
---
 
## 🧩 Tipo de cambio
<!-- Marca con una X lo que aplica -->
- [ ] ✨ `feat` — Nueva funcionalidad
- [ ] 🐛 `fix` — Corrección de bug
- [ ] 🔒 `security` — Mejora de seguridad
- [ ] 🗄️ `db` — Cambio en Neo4j (nodos, relaciones, índices, constraints)
- [ ] 🤖 `ai` — Cambio en el AI Service (Gemini, normalización, matchmaking)
- [ ] ♻️ `refactor` — Refactor sin cambio de comportamiento
- [ ] 🧪 `test` — Agregar o modificar tests
- [ ] 📝 `docs` — Solo documentación
- [ ] 🐳 `chore` — Docker, CI, configuración
---
 
## 📦 Módulo afectado
<!-- Marca con una X los módulos que toca este PR -->
- [ ] M1 — Autenticación (registro, login, JWT)
- [ ] M2 — Gestión de perfiles (habilidades, experiencia, disponibilidad)
- [ ] M3 — Motor de matchmaking (pipeline, scoring, GDS)
- [ ] M4 — Gestión de proyectos
- [ ] M5 — Equipos y tareas (Kanban, ciclo de vida)
- [ ] M6 — Retroalimentación e historial
- [ ] M7 — Capa de persistencia Neo4j
- [ ] M8 — API REST / Backend general
- [ ] M9 — Frontend / UI
- [ ] AI Service — Microservicio Gemini
- [ ] DevOps — Docker, CI, infraestructura
---
 
## ✅ Checklist General
<!-- Marca cada punto ANTES de solicitar revisión. No dejes sin marcar. -->
- [ ] El código compila sin errores (`npm run build`)
- [ ] El lint pasa sin warnings (`npm run lint`)
- [ ] No se commitea el archivo `.env` ni ningún secreto o API key
- [ ] Las variables de entorno nuevas fueron agregadas al `.env.example`
---
 
## 🔒 Checklist de Seguridad
<!-- Aplica según el módulo. Marca lo que revisaste. -->
 
**Backend / Neo4j**
- [ ] Las consultas Cypher usan **parámetros vinculados** (no template literals ni concatenación de strings)
- [ ] Los endpoints nuevos están protegidos con el **middleware JWT**
- [ ] Se aplica **whitelist de atributos** en los endpoints (no se acepta todo lo que manda el cliente)
- [ ] Se usan **DTOs** para filtrar la respuesta (no se expone el objeto completo de Neo4j)
- [ ] Se valida la relación jerárquica en el grafo para evitar **IDOR** (ej. el líder pertenece al proyecto antes de modificarlo)
**AI Service / Gemini**
- [ ] El **System Prompt** indica ignorar instrucciones embebidas en documentos del usuario
- [ ] Gemini recibe **solo datos estructurados** del grafo, nunca texto libre del usuario
- [ ] Los datos inferidos por Gemini **no se persisten sin confirmación** del usuario
- [ ] Los archivos subidos se renombran con **UUID** y se procesan en directorio temporal
- [ ] La validación del tipo de archivo usa **Magic Bytes**, no solo la extensión
**Autenticación**
- [ ] Los tokens JWT se verifican forzando el algoritmo **HS256**
- [ ] Las contraseñas se almacenan con **bcrypt** (mínimo 10 rondas)
---
 
## 🗄️ Checklist Neo4j (solo si el PR toca la base de datos)
- [ ] Las consultas nuevas usan **parámetros vinculados** para permitir Query Plan Caching
- [ ] Se agregaron los **índices o constraints** necesarios en `/neo4j/init/`
- [ ] Las relaciones nuevas están documentadas en el **modelo de datos** del proyecto
- [ ] Se probó la consulta directamente en **Neo4j Browser** (`http://localhost:7474`) antes de integrarla
---
 
## 🤖 Checklist Matchmaking (solo si el PR toca el motor de IA)
- [ ] El pipeline respeta las **4 fases**: Filtrado Estructural → Similitud Semántica → Reglas de Negocio → Explicaciones Gemini
- [ ] El score sigue la ponderación **60% habilidades / 20% disponibilidad / 20% reputación**
- [ ] Se aplicó la **penalización de redundancia** de habilidades duplicadas en el equipo
- [ ] Se aplicó la **regla de cobertura** de categorías funcionales (Frontend, Backend, QA, etc.)
- [ ] La **degradación controlada** funciona si Gemini no responde (el flujo no se bloquea)
---
 
## 🧪 Checklist de Tests (solo si el PR incluye tests)
- [ ] Los tests cubren el **caso exitoso** del flujo
- [ ] Los tests cubren al menos **un caso de error** (input inválido, recurso no encontrado, acceso denegado)
- [ ] Los tests pasan localmente (`npm run test`)
- [ ] Se probaron manualmente los endpoints con **Postman o Thunder Client**
---
 
## 📸 Evidencia
<!-- Agrega capturas de pantalla, GIFs o videos si hay cambios visuales en el frontend.
     Para cambios de backend, puedes pegar el output de Postman o los logs. -->
 
 
 
---
 
## 🗒️ Notas para el revisor
<!-- Algo específico que el revisor deba probar, un contexto importante, una decisión técnica que tomaste o una duda que tengas -->