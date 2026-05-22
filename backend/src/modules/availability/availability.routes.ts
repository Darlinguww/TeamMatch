import { Router } from 'express';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityParserService } from './availability-parser.service.js';
import { env } from '../../config/env.js';
import { AiServiceAvailabilityParser } from './ai-service-availability.parser.js';
import { ManualAvailabilityParser } from './manual-availability.parser.js';
import { NaturalLanguageAvailabilityParser } from './natural-language-availability.parser.js';

const router = Router();
const aiServiceUrl = env.aiServiceUrl;
const manualParser = new NaturalLanguageAvailabilityParser(new ManualAvailabilityParser());
const availabilityParserService = new AvailabilityParserService(
  new AiServiceAvailabilityParser(aiServiceUrl),
  manualParser
);
const availabilityController = new AvailabilityController(availabilityParserService);

router.post('/availability/parse', availabilityController.parse);

export default router;
