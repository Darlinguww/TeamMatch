import type { AuthenticatedUser } from '../../modules/auth/types/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
