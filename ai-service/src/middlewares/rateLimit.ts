import rateLimit from 'express-rate-limit';

export const aiApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiadas solicitudes al servicio de IA. Intenta más tarde.' });
  }
});
