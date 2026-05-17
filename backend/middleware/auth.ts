import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, VerifyOptions } from 'jsonwebtoken';
import { findUserById } from '../utils/db';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';

export function createToken(payload: object): string {
  const options = {
    algorithm: 'HS256' as jwt.Algorithm,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): any {
  const verifyOptions: VerifyOptions = { algorithms: ['HS256'] };
  return jwt.verify(token, JWT_SECRET, verifyOptions);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token) as { sub?: string; email?: string };
    if (!payload.sub || !payload.email) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = { userId: user.userId, email: user.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
