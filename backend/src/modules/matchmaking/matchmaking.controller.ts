import { Request, Response } from 'express';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { ProjectMatchRequestDto } from './dto/project-match.dto.js';
import { serializeProjectMatchmakingPage } from './matchmaking.serializer.js';
import { MatchmakingService } from './matchmaking.service.js';

export class MatchmakingController {
  public constructor(private readonly matchmakingService: MatchmakingService) {}

  public getProjectMatches = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const request = res.locals.projectMatchRequest as ProjectMatchRequestDto | undefined;

    if (!request) {
      throw new BadRequestError('Project match request validation is required');
    }

    const result = await this.matchmakingService.getProjectMatches(request.projectId, {
      limit: request.limit,
      offset: request.offset,
      includeExistingMembers: request.includeExistingMembers
    });

    res.status(200).json(serializeProjectMatchmakingPage(result));
  });
}
