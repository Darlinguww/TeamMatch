import { ConflictError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TeamDetailRepository } from './repositories/team-detail.repository.js';
import { RemoveTeamMemberResult, TeamComposition } from './types/team.types.js';

export class TeamsService {
  public constructor(private readonly teamRepository: TeamDetailRepository) {}

  public async getTeamComposition(teamId: string): Promise<TeamComposition> {
    const team = await this.teamRepository.findCompositionById(teamId.trim());

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team;
  }

  public async removeMember(teamId: string, memberId: string): Promise<RemoveTeamMemberResult> {
    const removalResult = await this.teamRepository.removeMemberIfNoActiveTasks(teamId, memberId);

    if (!removalResult) {
      throw new NotFoundError('Team not found');
    }

    if (!removalResult.membershipExists) {
      throw new NotFoundError('Team member not found');
    }

    if (removalResult.activeTasks.length > 0) {
      throw new ConflictError('Member has active assigned tasks', {
        teamId,
        memberId,
        activeTaskCount: removalResult.activeTasks.length,
        activeTasks: removalResult.activeTasks
      });
    }

    return {
      teamId: removalResult.teamId,
      memberId: removalResult.memberId,
      removed: true
    };
  }
}
