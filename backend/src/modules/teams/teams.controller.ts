import { Request, Response } from 'express';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { RemoveTeamMemberParamsDto, TeamIdParamsDto } from './dto/team-params.dto.js';
import { TeamsService } from './teams.service.js';

export class TeamsController {
  public constructor(private readonly teamsService: TeamsService) {}

  public getTeamComposition = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const params = res.locals.teamParams as TeamIdParamsDto | undefined;

    if (!params) {
      throw new BadRequestError('Team route parameter validation is required');
    }

    const team = await this.teamsService.getTeamComposition(params.teamId);

    res.status(200).json({ team });
  });

  public removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const params = res.locals.removeTeamMemberParams as RemoveTeamMemberParamsDto | undefined;

    if (!params) {
      throw new BadRequestError('Team member route parameter validation is required');
    }

    const result = await this.teamsService.removeMember(req.user!.userId, params.teamId, params.memberId);

    res.status(200).json(result);
  });
}
