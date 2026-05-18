import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { availabilityParseRateLimiter } from '../../shared/middlewares/rateLimit.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityParserService } from './availability-parser.service.js';
import { GeminiAvailabilityParser } from './gemini-availability.parser.js';
import { ManualAvailabilityParser } from './manual-availability.parser.js';

const router = Router();
const availabilityParserService = new AvailabilityParserService(
  new GeminiAvailabilityParser(),
  new ManualAvailabilityParser()
);
const availabilityController = new AvailabilityController(availabilityParserService);

router.post(
  '/availability/parse',
  requireAuth,
  availabilityParseRateLimiter,
  availabilityController.parse
);

export default router;
