import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../config/env.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors/HttpErrors.js';
import { verifyAccessToken } from '../../shared/utils/jwt.js';
import { validateRegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptService } from './services/login-attempt.service.js';
import { CreateUserInput, LoginAttemptState, UserEntity } from './types/auth.types.js';

class FakeUserRepository {
  public users = new Map<string, UserEntity>();
  public createError: unknown = null;

  public async findById(userId: string) {
    const user = Array.from(this.users.values()).find((candidate) => candidate.userId === userId);
    return user ? { userId: user.userId, email: user.email } : null;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.get(email) ?? null;
  }

  public async create(input: CreateUserInput): Promise<void> {
    if (this.createError) {
      throw this.createError;
    }

    this.users.set(input.email, {
      ...input,
      failedLoginAttempts: 0,
      lockedUntil: null
    });
  }
}

class FakeLoginAttemptRepository {
  public async findByUserId(): Promise<LoginAttemptState | null> {
    return null;
  }

  public async incrementFailedAttempt(userId: string, maxLoginAttempts: number, lockedUntilWhenBlocked: string) {
    const user = userRepository.users.get('login@example.com');

    if (!user || user.userId !== userId) {
      return { failedLoginAttempts: 0, lockedUntil: null };
    }

    user.failedLoginAttempts += 1;
    user.lockedUntil = user.failedLoginAttempts >= maxLoginAttempts ? lockedUntilWhenBlocked : null;

    return {
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil
    };
  }

  public async reset(userId: string): Promise<void> {
    const user = Array.from(userRepository.users.values()).find((candidate) => candidate.userId === userId);

    if (user) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }
  }
}

let userRepository: FakeUserRepository;
let authService: AuthService;

async function seedLoginUser(): Promise<UserEntity> {
  const user: UserEntity = {
    userId: 'user-login-1',
    user: 'Login User',
    email: 'login@example.com',
    passwordHash: await bcrypt.hash('Password123!', 4),
    failedLoginAttempts: 0,
    lockedUntil: null
  };
  userRepository.users.set(user.email, user);
  return user;
}

describe('AuthService', () => {
  beforeEach(() => {
    userRepository = new FakeUserRepository();
    authService = new AuthService(
      userRepository,
      new LoginAttemptService(new FakeLoginAttemptRepository())
    );
  });

  it('registra un usuario exitosamente con email unico', async () => {
    const result = await authService.register({
      user: 'Test User',
      email: 'new@example.com',
      password: 'Password123!'
    });

    expect(result).toEqual({ message: 'Usuario registrado' });
    expect(userRepository.users.get('new@example.com')?.passwordHash).not.toBe('Password123!');
  });

  it('rechaza email duplicado', async () => {
    await authService.register({
      user: 'Test User',
      email: 'duplicate@example.com',
      password: 'Password123!'
    });

    await expect(authService.register({
      user: 'Other User',
      email: 'duplicate@example.com',
      password: 'Password123!'
    })).rejects.toBeInstanceOf(ConflictError);
  });

  it('convierte errores de constraint de Neo4j en conflicto durante registro concurrente', async () => {
    userRepository.createError = { code: 'Neo.ClientError.Schema.ConstraintValidationFailed' };

    await expect(authService.register({
      user: 'Race User',
      email: 'race@example.com',
      password: 'Password123!'
    })).rejects.toBeInstanceOf(ConflictError);
  });

  it('valida contrasena debil en el DTO de registro', () => {
    const validation = validateRegisterDto({
      email: 'weak@example.com',
      password: '123'
    });

    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'password' })
    ]));
  });

  it('rechaza login con credenciales invalidas', async () => {
    await seedLoginUser();

    await expect(authService.login({
      email: 'login@example.com',
      password: 'WrongPassword!'
    })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('bloquea la cuenta tras exceder intentos fallidos', async () => {
    await seedLoginUser();

    for (let index = 0; index < env.maxLoginAttempts - 1; index += 1) {
      await expect(authService.login({
        email: 'login@example.com',
        password: 'WrongPassword!'
      })).rejects.toBeInstanceOf(UnauthorizedError);
    }

    await expect(authService.login({
      email: 'login@example.com',
      password: 'WrongPassword!'
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rechaza token expirado', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'expired@example.com' },
      env.jwtSecret,
      { algorithm: 'HS256', expiresIn: -1 }
    );

    expect(() => verifyAccessToken(expiredToken)).toThrow('jwt expired');
  });
});
