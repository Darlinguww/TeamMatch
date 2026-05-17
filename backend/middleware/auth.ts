import { requireAuth } from '../src/modules/auth/auth.routes.js';
import { AccessTokenPayload, signAccessToken, verifyAccessToken } from '../src/shared/utils/jwt.js';

export function createToken(payload: Pick<AccessTokenPayload, 'sub' | 'email'>): string {
  return signAccessToken(payload);
}

export function verifyToken(token: string): AccessTokenPayload {
  return verifyAccessToken(token);
}

export { requireAuth };
