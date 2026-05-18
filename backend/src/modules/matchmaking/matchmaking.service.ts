import { NotFoundError } from '../../shared/errors/HttpErrors.js';
import { MatchmakingRepository } from './matchmaking.repository.js';
import type {
  MatchmakingOptions,
  MatchmakingResult,
  ProjectMatchmakingPage,
  ProjectMatchmakingResult
} from './matchmaking.types.js';
import {
  scoreMatchmakingCandidate,
  sortMatchmakingResults
} from './matchmaking.utils.js';

export class MatchmakingService {
  public constructor(private readonly matchmakingRepository: MatchmakingRepository) {}

  public async getProjectMatches(
    projectId: string,
    input: { limit: number; offset: number; includeExistingMembers: boolean }
  ): Promise<ProjectMatchmakingPage> {
    const result = await this.scoreProjectCandidates(projectId, {
      includeProjectMembers: input.includeExistingMembers
    });
    const matches = result.matches.slice(input.offset, input.offset + input.limit);

    return {
      projectId: result.projectId,
      matches,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: result.matches.length
      }
    };
  }

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
