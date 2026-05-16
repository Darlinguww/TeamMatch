import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Flujo de Autenticación y Seguridad', () => {
  
  // Datos de prueba
  const testUser = {
    email: 'test@gmail.com',
    password: 'Password123!',
    weakPassword: '123'
  };

  describe('Registro de Usuario', () => {
    it('Debe registrar un usuario exitosamente', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testUser.email, password: testUser.password });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado');
    });

    it('Debe rechazar el registro con un email duplicado', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testUser.email, password: 'OtraPassword1!' });
      
      expect(res.status).toBe(409); // Conflict
    });

    it('Debe rechazar contraseñas débiles', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'nuevo@gmail.com', password: testUser.weakPassword });
      
      expect(res.status).toBe(400); // Bad Request
    });
  });

  describe('Login y Bloqueos', () => {
    it('Debe rechazar login con credenciales inválidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' });
      
      expect(res.status).toBe(401); // Unauthorized
    });

    it('Debe bloquear la cuenta tras exceder los intentos permitidos', async () => {
      // Simulamos múltiples intentos fallidos seguidos
      for(let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'WrongPassword!' });
      }
      
      // El intento que debería disparar el bloqueo
      const lockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password }); // Incluso con la correcta
        
      expect(lockedRes.status).toBe(403); // Forbidden
      expect(lockedRes.body.message).toMatch(/bloqueada/i);
    });
  });

  describe('Seguridad de Token (JWT)', () => {
    it('Debe rechazar el acceso a rutas protegidas con un token expirado o inválido', async () => {
      const res = await request(app)
        .get('/api/protected-route')
        .set('Authorization', 'Bearer token_falso_o_expirado');
      
      expect(res.status).toBe(401); 
    });
  });
});