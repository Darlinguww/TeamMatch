# QA test plan — requirement traceability



| Requirement | Status | Test file | Run |

|-------------|--------|-----------|-----|

| Matchmaking varied profiles / score order | Done | `tests/integration/profile.matchmaking.neo4j.test.ts` | `npm run test:neo4j` |

| Score consistent with graph fields | Done | same | |

| Redundancy penalty | Done | `matchmaking.utils.test.ts` | `npm test` |

| Availability compatibility | Done | `profile.matchmaking.neo4j.test.ts` | `npm run test:neo4j` |

| Performance ≤20s / 100 profiles | Done | `profile.matchmaking.neo4j.test.ts` | `npm run test:neo4j` |

| Semantic React→Vue (GDS / SIMILAR_A) | Done | `tests/integration/semantic-similarity.neo4j.test.ts` | `npm run test:neo4j` |

| Proposal quality (AI) | Done | `ai-service/.../matchmaking.prompts.test.ts` (perfiles variados) | `cd ai-service && npm test` |

| Reputation 20% pipeline | Done | `matchmaking.utils.test.ts` | |

| Azure no raw graph bypass | Done | `matchmaking.prompts.test.ts` | |

| Azure availability fallback | Done | `app.supertest.test.ts`, `availability-parser.service.test.ts` | |

| Task lifecycle | Done | `task.service.test.ts`, `tests/integration/task-workflow.neo4j.test.ts` | `npm run test:neo4j` |

| Invalid state transitions | Done | `task.service.test.ts` | |

| IDOR member cannot review | Done | `security.routes.test.ts` (Neo4j), `task-workflow.neo4j.test.ts` | `npm run test:neo4j` |

| Remove member with active tasks | Done | `team.service.test.ts`, `teams.member-removal.neo4j.test.ts` | `npm run test:neo4j` |

| Feedback on project close only | Done | `feedback.service.test.ts`, `feedback.window.neo4j.test.ts` | `npm run test:neo4j` |

| EVALUO uniqueness | Done | `feedback.service.test.ts`, `feedback.evaluo-uniqueness.neo4j.test.ts` | `npm run test:neo4j` |

| Reputation after feedback | Done | `matchmaking.reputation.neo4j.test.ts` | `npm run test:neo4j` |

| Auth register/login/lockout | Done | `auth.service.test.ts`, `app.supertest.test.ts` | |

| E2E register→login | Done | `tests/integration/e2e.auth-flow.test.ts` | `npm run test:neo4j` |

| Security / IDOR routes | Done | `tests/integration/security.routes.test.ts` | `npm run test:security` |

| Weights 60/20/20 | Done | `matchmaking.utils.test.ts` | |



## Frontend manual QA



1. Set `VITE_USE_API_AUTH=true` and `VITE_API_URL`.

2. Register / login against backend.

3. Feedback UI: still uses mock list; submit can call API when wired in `Feedback.tsx`.



## Regression checklist before release



- [ ] `cd backend && npm run build && npm test`

- [ ] `docker compose up -d neo4j && cd backend && npm run test:neo4j`

- [ ] `cd ai-service && npm test`

- [ ] `cd frontend && npm run build`

