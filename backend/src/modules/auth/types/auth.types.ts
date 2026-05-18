export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface UserEntity extends AuthenticatedUser {
  user: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

export interface CreateUserInput {
  userId: string;
  user: string;
  email: string;
  passwordHash: string;
}

export interface LoginAttemptState {
  failedLoginAttempts: number;
  lockedUntil: string | null;
}
