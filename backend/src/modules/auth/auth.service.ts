import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UnauthorizedError, ConflictError, ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UserRepository } from './repositories/user.repository.js';
import { LoginAttemptService } from './services/login-attempt.service.js';
import { UserEntity } from './types/auth.types.js';

interface RegisterResponse {
  message: string;
}

interface LoginResponse {
  token: string;
}

export class AuthService {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly loginAttemptService: LoginAttemptService
  ) {}

  public async register(input: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.userRepository.create({
      userId: randomUUID(),
      user: input.user,
      email: input.email,
      passwordHash
    });

    return { message: 'Usuario registrado' };
  }

  public async login(input: LoginDto): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userWithCurrentLockState = await this.normalizeExpiredLock(user);
    this.loginAttemptService.ensureAccountIsNotLocked(userWithCurrentLockState);

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      const failedLoginResult = await this.loginAttemptService.recordFailedAttempt(userWithCurrentLockState);

      if (failedLoginResult.isLocked) {
        throw new ForbiddenError('Account temporarily locked. Try again later.', {
          lockedUntil: failedLoginResult.lockedUntil
        });
      }

      throw new UnauthorizedError('Invalid credentials');
    }

    await this.loginAttemptService.reset(user.userId);

    return {
      token: signAccessToken({ sub: user.userId, email: user.email })
    };
  }

  private async normalizeExpiredLock(user: UserEntity): Promise<UserEntity> {
    if (!user.lockedUntil) {
      return user;
    }

    const lockedUntilTimestamp = new Date(user.lockedUntil).getTime();

    if (Number.isNaN(lockedUntilTimestamp) || lockedUntilTimestamp > Date.now()) {
      return user;
    }

    await this.loginAttemptService.reset(user.userId);

    return {
      ...user,
      failedLoginAttempts: 0,
      lockedUntil: null
    };
  }
}
