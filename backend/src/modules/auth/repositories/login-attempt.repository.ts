import { driver } from '../../../database/neo4j.js';
import { LoginAttemptState } from '../types/auth.types.js';

function mapLoginAttemptState(record: { get(key: string): unknown }): LoginAttemptState {
  return {
    failedLoginAttempts: Number(record.get('failedLoginAttempts') ?? 0),
    lockedUntil: record.get('lockedUntil') ? String(record.get('lockedUntil')) : null
  };
}

export class LoginAttemptRepository {
  public async findByUserId(userId: string): Promise<LoginAttemptState | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         RETURN coalesce(u.failedLoginAttempts, 0) AS failedLoginAttempts,
                u.lockedUntil AS lockedUntil
         LIMIT 1`,
        { userId }
      );

      return result.records.length > 0 ? mapLoginAttemptState(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async incrementFailedAttempt(
    userId: string,
    maxLoginAttempts: number,
    lockedUntilWhenBlocked: string
  ): Promise<LoginAttemptState> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         WITH u, coalesce(u.failedLoginAttempts, 0) + 1 AS nextFailedLoginAttempts
         SET u.failedLoginAttempts = nextFailedLoginAttempts,
             u.lastFailedLoginAt = $lastFailedLoginAt,
             u.lockedUntil = CASE
               WHEN nextFailedLoginAttempts >= $maxLoginAttempts THEN $lockedUntilWhenBlocked
               ELSE null
             END
         RETURN u.failedLoginAttempts AS failedLoginAttempts,
                u.lockedUntil AS lockedUntil`,
        {
          userId,
          maxLoginAttempts,
          lockedUntilWhenBlocked,
          lastFailedLoginAt: new Date().toISOString()
        }
      );

      return result.records.length > 0
        ? mapLoginAttemptState(result.records[0])
        : { failedLoginAttempts: 0, lockedUntil: null };
    } finally {
      await session.close();
    }
  }

  public async reset(userId: string): Promise<void> {
    const session = driver.session();

    try {
      await session.run(
        `MATCH (u:Usuario {userId: $userId})
         SET u.failedLoginAttempts = 0
         REMOVE u.lockedUntil`,
        { userId }
      );
    } finally {
      await session.close();
    }
  }
}
