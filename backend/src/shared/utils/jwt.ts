import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/HttpErrors.js';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
}

const signOptions: SignOptions = {
  algorithm: 'HS256',
  expiresIn: env.jwtExpiresIn as SignOptions['expiresIn']
};

const verifyOptions: VerifyOptions = {
  algorithms: ['HS256']
};

export function signAccessToken(payload: Pick<AccessTokenPayload, 'sub' | 'email'>): string {
  return jwt.sign(payload, env.jwtSecret, signOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decodedToken = jwt.verify(token, env.jwtSecret, verifyOptions);

  if (typeof decodedToken !== 'object' || decodedToken === null) {
    throw new UnauthorizedError('Invalid token payload');
  }

  const decodedPayload = decodedToken as JwtPayload;

  if (typeof decodedPayload.sub !== 'string' || typeof decodedPayload.email !== 'string') {
    throw new UnauthorizedError('Invalid token payload');
  }

  return decodedPayload as AccessTokenPayload;
}
