# Seguridad en TeamMatch

Este documento resume el modelo de amenazas, las variables de entorno relacionadas con seguridad y los controles aplicados en backend y ai-service. Está pensado para el equipo de desarrollo.

## Resumen del modelo de amenazas

| Superficie | Riesgo principal | Mitigación |
|----------|------------------|------------|
| **ai-service** | Acceso no autorizado a APIs de IA (coste, abuso) | Token interno compartido, sin puerto público en compose base, rate limit |
| **Backend → ai-service** | SSRF si `AI_SERVICE_URL` apunta a hosts arbitrarios | Allowlist de hostname al arranque |
| **Subidas PDF / texto** | Prompt injection, PDFs enormes | Patrones ES/EN, límite de páginas, timeout de parseo, tope de caracteres |
| **Auth / login** | Fuerza bruta | Bloqueo por intentos + rate limit HTTP en `/login` |
| **Catálogo de skills** | Cualquier usuario autenticado podía mutar el catálogo | `SKILLS_ADMIN_EMAILS` + rate limit en escrituras |
| **Disponibilidad (parse)** | Abuso de Gemini sin autenticación | `requireAuth` + rate limit |
| **GDS rebuild** | Reindexado costoso del grafo | JWT + secreto de cabecera; secreto obligatorio en producción |

## Variables de entorno

| Variable | Servicio | Descripción |
|----------|----------|-------------|
| `JWT_SECRET` | backend | Firma de tokens; obligatorio y fuerte en producción |
| `CORS_ORIGIN` | backend | Orígenes permitidos en producción |
| `INTERNAL_AI_SERVICE_TOKEN` | backend, ai-service | Secreto compartido; cabecera `X-Internal-Service-Token` |
| `AI_SERVICE_URL` | backend | URL del microservicio; solo hosts `ai-service`, `localhost`, `127.0.0.1`, `::1` |
| `GDS_REBUILD_SECRET` | backend | Cabecera `X-GDS-Rebuild-Secret` para rebuild semántico; obligatorio en producción |
| `SKILLS_ADMIN_EMAILS` | backend | Emails (separados por coma) autorizados para POST/PUT/DELETE en `/api/skills` |
| `MAX_SUGGEST_SKILLS_TEXT_LENGTH` | backend | Tope de texto antes de llamar a ai-service (default 20000) |
| `MAX_PDF_PAGES` | backend | Máximo de páginas al extraer PDF (default 30) |
| `MAX_LOGIN_ATTEMPTS` / `LOGIN_BLOCK_DURATION_MS` | backend | Bloqueo de cuenta tras intentos fallidos |
| `GEMINI_API_KEY` | backend (availability), ai-service | Claves de proveedor IA |

Generar token interno de ejemplo:

```bash
openssl rand -hex 32
```

## Token interno (backend ↔ ai-service)

1. Definir el mismo valor en `INTERNAL_AI_SERVICE_TOKEN` en backend y ai-service.
2. El backend envía la cabecera `X-Internal-Service-Token` en `POST` a `/api/ai/process-skills`.
3. El ai-service rechaza con `401` cualquier ruta bajo `/api/*` sin token válido.
4. `/health` permanece sin autenticación (solo comprobación de vida).

En Docker, el puerto `3001` **no** se publica en `docker-compose.yml`; solo en `docker-compose.override.yml` para desarrollo local.

## Rate limiting (HTTP)

Ventana: **15 minutos**. Respuesta `429` con código `TOO_MANY_REQUESTS`.

| Ruta | Límite aprox. |
|------|----------------|
| `POST /api/auth/login` | 20 / IP |
| `POST /api/profile/skills` (sugerencias IA) | 30 / IP |
| `POST /api/availability/parse` | 40 / IP |
| `POST/PUT/DELETE /api/skills` | 60 / IP |
| Todas las rutas `/api/*` del ai-service | 120 / IP |

Además del rate limit, el login mantiene el bloqueo por cuenta (`MAX_LOGIN_ATTEMPTS`).

## Requisitos por endpoint (backend)

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| POST | `/api/auth/register` | No | Validación de contraseña |
| POST | `/api/auth/login` | No | Rate limit |
| GET | `/api/auth/me` | JWT | |
| PUT | `/api/profile/*` | JWT | |
| POST | `/api/profile/skills` | JWT | Sugerencias IA; rate limit; validación texto/PDF |
| GET | `/api/users/search`, `/api/users/:id/profile` | No | Perfil público sin datos sensibles |
| GET | `/api/skills`, `/api/skills/:id` | No | Lectura pública del catálogo |
| POST/PUT/DELETE | `/api/skills` | JWT + admin email | `SKILLS_ADMIN_EMAILS` |
| POST | `/api/availability/parse` | JWT | Rate limit |
| POST | `/projects/match/phase2/rebuild-semantic-index` | JWT + `X-GDS-Rebuild-Secret` | Secreto obligatorio en prod |
| Rutas `/projects/*`, `/tasks/*`, `/teams/*` | JWT | Permisos de dominio en servicios (p. ej. líder en revisiones) |

## ai-service

| Ruta | Auth |
|------|------|
| `GET /health` | No |
| `POST /api/ai/*`, `POST /api/matchmaking/*` | `X-Internal-Service-Token` |

## Probar seguridad en local

1. Copiar `.env.example` a `.env` y rellenar `INTERNAL_AI_SERVICE_TOKEN`, `JWT_SECRET`, etc.
2. Levantar stack: `docker compose up` (el override expone `3001` en dev).
3. Sin token, el ai-service debe responder 401:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/ai/process-skills \
  -H "Content-Type: application/json" -d '{"text":"React"}'
# Esperado: 401
```

4. Disponibilidad sin JWT:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/availability/parse \
  -H "Content-Type: application/json" -d '{"text":"lunes 9-12"}'
# Esperado: 401
```

5. Ejecutar tests:

```bash
cd backend && npm run lint && npm test
cd ai-service && npm run lint && npm test
```

## Tests de seguridad relevantes

- `backend/src/shared/security/prompt-injection.test.ts`
- `backend/src/shared/security/ai-service-url.test.ts`
- `backend/src/modules/profile/profile.service.suggest-skills.test.ts`
- `backend/src/app.supertest.test.ts` (auth en availability)
- `backend/src/modules/tasks/task-workflow.service.test.ts` (revisión solo líder)
- `ai-service/src/middlewares/internal-auth.middleware.test.ts`
