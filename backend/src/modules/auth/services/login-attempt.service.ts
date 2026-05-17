import { env } from '../../../config/env.js';
import { ForbiddenError } from '../../../shared/errors/HttpErrors.js';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository.js';
import { LoginAttemptState, UserEntity } from '../types/auth.types.js';

export interface FailedLoginResult {
  failedLoginAttempts: number;
  lockedUntil: string | null;
  isLocked: boolean;
}

export class LoginAttemptService {
  public constructor(private readonly loginAttemptRepository: LoginAttemptRepository) {}

  public ensureAccountIsNotLocked(state: LoginAttemptState): void {
    if (!state.lockedUntil) {
      return;
    }

    const lockedUntilDate = new Date(state.lockedUntil);
    if (Number.isNaN(lockedUntilDate.getTime())) {
      return;
    }

    if (lockedUntilDate.getTime() > Date.now()) {
      throw new ForbiddenError('Account temporarily locked. Try again later.', {
        lockedUntil: state.lockedUntil
      });
    }
  }

  public async recordFailedAttempt(user: UserEntity): Promise<FailedLoginResult> {
    const nextFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLockAccount = nextFailedAttempts >= env.maxLoginAttempts;
    const lockedUntil = shouldLockAccount
      ? new Date(Date.now() + env.loginBlockDurationMs).toISOString()
      : null;

    await this.loginAttemptRepository.updateFailedAttempt(user.userId, nextFailedAttempts, lockedUntil);

    return {
      failedLoginAttempts: nextFailedAttempts,
      lockedUntil,
      isLocked: shouldLockAccount
    };
  }

  public async reset(userId: string): Promise<void> {
    await this.loginAttemptRepository.reset(userId);
  }
}
