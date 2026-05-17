import { Request, Response } from 'express';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { AvailabilityParserService } from './availability-parser.service.js';

function readText(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestError('Request body must be an object');
  }

  const text = (body as Record<string, unknown>).text;

  if (typeof text !== 'string' || !text.trim()) {
    throw new BadRequestError('Availability text is required');
  }

  return text;
}

export class AvailabilityController {
  public constructor(private readonly availabilityParserService: AvailabilityParserService) {}

  public parse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.availabilityParserService.parse(readText(req.body));
    res.status(200).json(result);
  });
}
