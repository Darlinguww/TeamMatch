import { NotFoundError } from '../../shared/errors/HttpErrors.js';
import { MatchmakingRepository } from './matchmaking.repository.js';
import type {
  MatchmakingOptions,
  MatchmakingResult,
  OpenProjectRecommendation,
  ProjectMatchmakingPage,
  ProjectMatchmakingResult
} from './matchmaking.types.js';
import {
  scoreDiscoveryAgainstProject,
  scoreMatchmakingCandidate,
  sortMatchmakingResults
} from './matchmaking.utils.js';

export class MatchmakingService {
  public constructor(private readonly matchmakingRepository: MatchmakingRepository) {}

  public async getProjectMatches(
    userId: string,
    projectId: string,
    input: { limit: number; offset: number; includeExistingMembers: boolean }
  ): Promise<ProjectMatchmakingPage> {
    const isMember = await this.matchmakingRepository.isUserProjectMember(userId, projectId);

    if (!isMember) {
      throw new NotFoundError('Project not found');
    }

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

  public async scoreUserAgainstProject(userId: string, projectId: string): Promise<number> {
    const context = await this.matchmakingRepository.findProjectContext(projectId.trim());

    if (!context) {
      return 0;
    }

    const candidate = context.candidates.find((item) => item.userId === userId);

    if (!candidate) {
      return 0;
    }

    const result = scoreMatchmakingCandidate(candidate, context.roles, context.teamMembers, {});

    return scoreDiscoveryAgainstProject(result, context.roles);
  }

  public async recommendOpenProjectsForUser(
    userId: string,
    openProjects: Array<{ projectId: string; title: string }>
  ): Promise<OpenProjectRecommendation[]> {
    const recommendations = await Promise.all(
      openProjects.map(async (project) => ({
        projectId: project.projectId,
        title: project.title,
        score: await this.scoreUserAgainstProject(userId, project.projectId)
      }))
    );

    return recommendations.sort((left, right) => right.score - left.score);
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
    const scored = candidates.map((candidate) => (
      scoreMatchmakingCandidate(candidate, context.roles, context.teamMembers, options)
    ));
    const matches = this.dedupeResultsByUser(sortMatchmakingResults(scored));

    return {
      projectId: context.projectId,
      title: context.title,
      roles: context.roles,
      matches
    };
  }

  private dedupeResultsByUser(results: MatchmakingResult[]): MatchmakingResult[] {
    const byUser = new Map<string, MatchmakingResult>();

    for (const result of results) {
      const existing = byUser.get(result.userId);
      if (!existing || result.score > existing.score) {
        byUser.set(result.userId, result);
      }
    }

    return sortMatchmakingResults([...byUser.values()]);
  }
}
