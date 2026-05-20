# Security audit — TeamMatch

**Date:** 2026-05-18  
**Scope:** backend (`develop` + working tree), ai-service, frontend  
**Compared branch:** `origin/feature/IntegracionBranchs-M3-SCRUM130-SkillsAI-Seguridad`

## Executive summary

| Area | Risk | Status |
|------|------|--------|
| IDOR on tasks/projects/teams | High | Mitigated in services; centralized helpers added |
| Unauthenticated `/match/:id/score` | High | **Fixed** — `requireAuth` + result cap |
| Public profile leakage | Medium | Serializer strips email/password |
| Azure prompt injection | Medium | Structured graph JSON; free-text isolated in section |
| Dependency CVEs (vite) | High (dev) | Upgraded to 6.4.1 |
| Neo4j default credentials | High (prod) | Documented restricted user init script |
| Register spam | Medium | Optional email whitelist via env |

## Route inventory & auth coverage

| Prefix | Method | Auth | Ownership / role check |
|--------|--------|------|-------------------------|
| `/api/auth/register` | POST | No | DTO + optional whitelist |
| `/api/auth/login` | POST | No | Lockout service |
| `/api/auth/me` | GET | JWT | User reload |
| `/api/profile/*` | PUT/POST | JWT | Self only (controller) |
| `/api/users/:id/profile` | GET | No | Public serializer |
| `/api/users/:id/reputation` | GET | No | Public aggregate |
| `/api/skills` | GET | No | Read-only catalog |
| `/api/skills` | POST/PUT/DELETE | JWT | Admin middleware |
| `/api/availability/parse` | POST | No | Size limits; Gemini→manual fallback |
| `/api/feedback` | POST | JWT | Member + closed project window |
| `/api/feedback/projects/:id/close` | POST | JWT | Leader only |
| `/projects` | CRUD/match | JWT | `findProjectForUser` / leader checks |
| `/projects/:id/match` | GET | JWT | Matchmaking controller |
| `/tasks/:id/status` | PATCH | JWT | Member; workflow repo |
| `/tasks/:id/review` | POST | JWT | **Leader only** |
| `/tasks/:taskId` | GET/PUT/DELETE | JWT | Project membership |
| `/teams/:id` | GET | JWT | Membership |
| `/teams/:id/members` | PUT/DELETE | JWT | **Leader only** |
| `/match/:id/score` | GET | **JWT (fixed)** | Authenticated; limit 100 profiles |

## IDOR surfaces reviewed

1. **Tasks** — `TaskService.ensureProjectAccess` / `ensureTaskAccess`; `TasksService.reviewTask` requires `actorIsLeader`.
2. **Projects** — `findProjectForUser` returns null → 404 for non-members.
3. **Teams** — `TeamService.updateMembers` requires `isProjectLeader`.
4. **Feedback** — membership + leader close; uniqueness on `EVALUO` via repository.
5. **Match score** — was open; now JWT + bounded query.

**Residual risk:** `/match/:id/score` still allows any authenticated user to score any public profile ID. Consider scoping to shared projects or leader role.

## Mitigations implemented

- `backend/src/shared/security/authorization.ts` — reusable guards.
- `/match/:id/score` — `requireAuth`, `MAX_COMPARISON_LIMIT = 100`.
- `AUTH_REGISTER_EMAIL_WHITELIST` — optional domain/email allowlist.
- Matchmaking weights aligned to **60 / 20 / 20** (skills / availability / reputation).
- Frontend `apiClient.ts` + `VITE_USE_API_AUTH` for real JWT flow.
- Tests: `tests/integration/security.routes.test.ts`, `authorization.test.ts`.

## AI / prompt security

| Path | User free text in model? | Notes |
|------|---------------------------|-------|
| Matchmaking (Azure) | Optional `userInstructions` only | Graph data via `JSON.stringify`; see `matchmaking.prompts.test.ts` |
| Skill extraction (Azure) | Yes (CV text) | By design for upload; size validators |
| Availability (Gemini) | Yes | Manual fallback when key missing |

## npm audit (frontend)

| | Before (vite 6.3.5) | After (vite 6.4.1) |
|--|---------------------|---------------------|
| High | 1 (vite dev server) | Run `npm audit` after `npm install` |
| Moderate | 3 | |
| Low | 2 | |

Dev-server CVEs affect **local development only**, not production static builds. Keep Vite updated.

## Recommendations (backlog)

1. Enforce `GDS_REBUILD_SECRET` + leader role on semantic rebuild (partially present).
2. Wire Feedback UI fully to `feedbackApi` (auth path ready; list still mock).
3. Rate-limit `/api/users/search` and `/match/*`.
4. CI job with `RUN_E2E_NEO4J=true` against docker-compose test profile.
