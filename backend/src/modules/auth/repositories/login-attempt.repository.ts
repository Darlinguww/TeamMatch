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

  public async updateFailedAttempt(userId: string, failedLoginAttempts: number, lockedUntil: string | null): Promise<void> {
    const session = driver.session();

    try {
      await session.run(
        `MATCH (u:Usuario {userId: $userId})
         SET u.failedLoginAttempts = $failedLoginAttempts,
             u.lastFailedLoginAt = $lastFailedLoginAt,
             u.lockedUntil = $lockedUntil`,
        {
          userId,
          failedLoginAttempts,
          lockedUntil,
          lastFailedLoginAt: new Date().toISOString()
        }
      );
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
