import { NotFoundError } from '../../shared/errors/HttpErrors.js';
import { MatchmakingRepository } from './matchmaking.repository.js';
import type {
  MatchmakingOptions,
  MatchmakingResult,
  ProjectMatchmakingResult
} from './matchmaking.types.js';
import {
  scoreMatchmakingCandidate,
  sortMatchmakingResults
} from './matchmaking.utils.js';

export class MatchmakingService {
  public constructor(private readonly matchmakingRepository: MatchmakingRepository) {}

  public async scoreProjectCandidates(projectId: string, options: MatchmakingOptions = {}): Promise<ProjectMatchmakingResult> {
    const context = await this.matchmakingRepository.findProjectContext(projectId.trim());

    if (!context) {
      throw new NotFoundError('Project not found');
    }

    const candidates = options.includeProjectMembers
      ? context.candidates
      : context.candidates.filter((candidate) => (
        !context.teamMembers.some((member) => member.userId === candidate.userId)
      ));
    const matches: MatchmakingResult[] = sortMatchmakingResults(candidates.map((candidate) => (
      scoreMatchmakingCandidate(candidate, context.roles, context.teamMembers, options)
    )));

    return {
      projectId: context.projectId,
      title: context.title,
      roles: context.roles,
      matches
    };
  }
}
