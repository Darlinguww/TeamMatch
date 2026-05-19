# Integration testing



## Stack



| Layer | Tool |

|-------|------|

| Unit / service | Vitest |

| HTTP | Supertest + Express `app` |

| DB | Neo4j real (Docker) para integración |



## Layout



```

backend/

  src/**/*.test.ts          # unit tests (sin Neo4j mock del driver)

  tests/integration/        # HTTP security, E2E y Neo4j real

  tests/helpers/neo4j-integration.ts

ai-service/

  src/**/*.test.ts

```



## Commands



```bash

# Unit tests (no requieren Neo4j)

cd backend

npm install

npm run build

npm test



# Integración HTTP (validaciones sin DB + security)

npm run test:integration



# Integración con Neo4j real (Docker)

docker compose up -d neo4j

# Esperar healthcheck (~init scripts en neo4j/init/)

npm run test:neo4j



cd ai-service

npm test

```



## Environment



| Variable | Purpose |

|----------|---------|

| `NODE_ENV=test` | Set automatically by vitest |

| `JWT_SECRET` | Test secret (default `dev-secret` in non-production) |

| `RUN_E2E_NEO4J=true` | Habilita suites Neo4j (`vitest.neo4j.config.ts` lo fija en `test:neo4j`) |

| `NEO4J_TEST_URI` | Bolt desde el host (default `bolt://localhost:7687`) |

| `NEO4J_USER` / `NEO4J_PASSWORD` | Credenciales del contenedor (`.env`) |



Copy `.env.example` to `.env` for local E2E:



```bash

docker compose up -d neo4j

cd backend && npm run test:neo4j

```



## Mocking strategy



- **Sin Neo4j:** Supertest valida DTOs/JWT; disponibilidad hace fallback manual si el AI service no responde.

- **Unit services:** repositorios in-memory solo donde no hay driver (`FakeUserRepository` en auth).

- **Neo4j real:** matchmaking de perfiles, similitud semántica (SIMILAR_A), E2E register→login.

- **Eliminado:** `vi.mock('../../database/neo4j.js')` en feedback; `FakeProfileRepository` en matchmaking (movido a `tests/integration/*.neo4j.test.ts`).



## Azure OpenAI manual fallback



Cuando el AI service no está disponible, `POST /api/availability/parse` devuelve:



```json

{ "source": "manual", "availability": [] }

```



Cubierto por `app.supertest.test.ts`.



## Docker test profile



Neo4j usa la imagen `neo4j:5.26.0-community` con seeds en `neo4j/init/`. El flujo completo `register → login → project → match` requiere grafo inicializado (`03_test_data.cypher`, `02_skills.cypher`, etc.).

