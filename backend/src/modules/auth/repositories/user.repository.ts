import { driver } from '../../../database/neo4j.js';
import { AuthenticatedUser, CreateUserInput, UserEntity } from '../types/auth.types.js';

function mapUserRecord(record: { get(key: string): unknown }): UserEntity {
  return {
    userId: String(record.get('userId')),
    user: String(record.get('user')),
    email: String(record.get('email')),
    passwordHash: String(record.get('passwordHash')),
    failedLoginAttempts: Number(record.get('failedLoginAttempts') ?? 0),
    lockedUntil: record.get('lockedUntil') ? String(record.get('lockedUntil')) : null
  };
}

export class UserRepository {
  public async findById(userId: string): Promise<AuthenticatedUser | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        'MATCH (u:Usuario {userId: $userId}) RETURN u.userId AS userId, u.email AS email LIMIT 1',
        { userId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        userId: String(record.get('userId')),
        email: String(record.get('email'))
      };
    } finally {
      await session.close();
    }
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {email: $email})
         RETURN u.userId AS userId,
                u.user AS user,
                u.email AS email,
                u.passwordHash AS passwordHash,
                coalesce(u.failedLoginAttempts, 0) AS failedLoginAttempts,
                u.lockedUntil AS lockedUntil
         LIMIT 1`,
        { email }
      );

      return result.records.length > 0 ? mapUserRecord(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async create(input: CreateUserInput): Promise<void> {
    const session = driver.session();

    try {
      await session.run(
        `CREATE (u:Usuario {
           userId: $userId,
           user: $user,
           email: $email,
           passwordHash: $passwordHash,
           failedLoginAttempts: 0,
           lockedUntil: null,
           createdAt: $createdAt
         })`,
        {
          ...input,
          createdAt: new Date().toISOString()
        }
      );
    } finally {
      await session.close();
    }
  }
}
