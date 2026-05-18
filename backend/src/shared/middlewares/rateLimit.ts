import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';

function createLimiter(options: Partial<Options>): RateLimitRequestHandler {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
        }
      });
    },
    ...options
  });
}

export const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20
});

export const suggestSkillsRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30
});

export const availabilityParseRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40
});

export const skillsCatalogWriteRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60
});
