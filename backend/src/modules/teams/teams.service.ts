import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TeamDetailRepository } from './repositories/team-detail.repository.js';
import { RemoveTeamMemberResult, TeamComposition } from './types/team.types.js';

export class TeamsService {
  public constructor(private readonly teamRepository: TeamDetailRepository) {}

  public async getTeamComposition(actorUserId: string, teamId: string): Promise<TeamComposition> {
    const normalizedTeamId = teamId.trim();
    const team = await this.teamRepository.findCompositionById(normalizedTeamId);

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (!(await this.teamRepository.isProjectMember(actorUserId, normalizedTeamId))) {
      throw new ForbiddenError('Forbidden');
    }

    return team;
  }

  public async removeMember(actorUserId: string, teamId: string, memberId: string): Promise<RemoveTeamMemberResult> {
    const normalizedTeamId = teamId.trim();

    if (!(await this.teamRepository.isProjectLeader(actorUserId, normalizedTeamId))) {
      throw new ForbiddenError('Only project leaders can remove team members');
    }

    const removalResult = await this.teamRepository.removeMemberIfNoActiveTasks(normalizedTeamId, memberId);

    if (!removalResult) {
      throw new NotFoundError('Team not found');
    }

    if (!removalResult.membershipExists) {
      throw new NotFoundError('Team member not found');
    }

    if (removalResult.memberIsLeader) {
      throw new BadRequestError('Cannot remove the project leader from the team');
    }

    if (removalResult.activeTasks.length > 0) {
      throw new ConflictError('Member has active assigned tasks', {
        teamId: normalizedTeamId,
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
