import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './app.js';
import { env } from './config/env.js';

describe('API HTTP con Supertest', () => {
  it('muestra que el backend esta vivo', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'TeamMatch backend'
    });
  });

  it('devuelve fallback manual vacio cuando Gemini no esta disponible', async () => {
    const response = await request(app)
      .post('/api/availability/parse')
      .send({ text: 'viernes de 8 a 10' })
      .expect(200);

    expect(response.body).toEqual({
      source: 'manual',
      availability: []
    });
  });

  it('devuelve error uniforme cuando el texto de disponibilidad falta', async () => {
    const response = await request(app)
      .post('/api/availability/parse')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Availability text is required'
      }
    });
  });

  it('rechaza registro con contrasena debil sin tocar base de datos', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'weak-password@example.com',
        password: '123'
      })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Validation failed'
    });
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'password' })
    ]));
  });

  it('rechaza token expirado en ruta protegida', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'expired@example.com' },
      env.jwtSecret,
      { algorithm: 'HS256', expiresIn: -1 }
    );

    const response = await request(app)
      .get('/api/protected-route')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'TOKEN_EXPIRED',
      message: 'Token expired'
    });
  });

  it('mantiene rutas de perfil bajo /api', async () => {
    const apiResponse = await request(app)
      .put('/api/profile/experience')
      .send({ experience: [] })
      .expect(401);

    expect(apiResponse.body.error).toMatchObject({
      code: 'UNAUTHORIZED'
    });

    await request(app)
      .put('/profile/experience')
      .send({ experience: [] })
      .expect(404);
  });
});
