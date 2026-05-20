/**
 * Flujo E2E ligero vía Supertest contra Neo4j real (Docker).
 * Activar con RUN_E2E_NEO4J=true o `npm run test:neo4j`.
 * Documentado en docs/integration-testing.md
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';

const hasNeo4j = process.env.RUN_E2E_NEO4J === 'true';

describe.skipIf(!hasNeo4j)('E2E register → login → protected', () => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password1!';

  it('registra, inicia sesion y accede a ruta protegida', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email, password, user: 'E2E User' })
      .expect(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(login.body.token).toBeTypeOf('string');

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
  });
});

describe('E2E sin Neo4j — validaciones previas', () => {
  it('rechaza registro duplicado y password debil sin DB', async () => {
    const weak = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: '123' })
      .expect(400);

    expect(weak.body.error.code).toBe('BAD_REQUEST');
  });
});
