import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/HttpErrors.js';
import { verifyAccessToken } from '../../../shared/utils/jwt.js';
import { UserRepository } from '../repositories/user.repository.js';

export class JwtAuthMiddleware {
  public constructor(private readonly userRepository: UserRepository) {}

  public authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractBearerToken(req.header('Authorization'));
      const payload = verifyAccessToken(token);
      const user = await this.userRepository.findById(payload.sub);

      if (!user || user.email !== payload.email) {
        throw new UnauthorizedError('Unauthorized');
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };

  private extractBearerToken(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    const [scheme, token, ...extraParts] = authHeader.trim().split(/\s+/);

    if (scheme !== 'Bearer' || !token || extraParts.length > 0) {
      throw new UnauthorizedError('Malformed authorization header');
    }

    return token;
  }
}
