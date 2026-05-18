import { describe, expect, it } from 'vitest';
import { AppError } from '../../shared/errors/AppError.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { ProjectRepository, ProjectService } from './project.service.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectMatchWeights,
  ProjectPhaseOneCandidate,
  ProjectPhaseTwoCandidate,
  ProjectSummary,
  SemanticIndexRebuildResult
} from './types/project.types.js';

class FakeProjectRepository implements ProjectRepository {
  public phaseTwoCandidates: ProjectPhaseTwoCandidate[] | null = [];
  public rebuildResult: SemanticIndexRebuildResult = {
    graphName: 'teamMatchSkillsSimilarity',
    nodeCount: 10,
    relationshipCount: 20,
    relationshipsCreated: 3,
    similarityCutoff: 0.35,
    topK: 10
  };
  public lastPhaseTwoCall: { userId: string; projectId: string; weights: ProjectMatchWeights } | null = null;
  public lastRebuildInput: { similarityCutoff: number; topK: number } | null = null;
  public shouldFailRebuild = false;

  public async findMissingSkillNames(): Promise<string[]> {
    return [];
  }

  public async createProject(_leaderId: string, _projectId: string, _input: CreateProjectInput): Promise<void> {}

  public async listProjectsForUser(): Promise<ProjectSummary[]> {
    return [];
  }

  public async findProjectForUser(): Promise<ProjectDetails | null> {
    return null;
  }

  public async findPhaseOneCandidates(): Promise<ProjectPhaseOneCandidate[] | null> {
    return [];
  }

  public async findPhaseTwoCandidates(
    userId: string,
    projectId: string,
    weights: ProjectMatchWeights
  ): Promise<ProjectPhaseTwoCandidate[] | null> {
    this.lastPhaseTwoCall = { userId, projectId, weights };
    return this.phaseTwoCandidates;
  }

  public async rebuildSemanticIndex(input: { similarityCutoff: number; topK: number }): Promise<SemanticIndexRebuildResult> {
    this.lastRebuildInput = input;
    if (this.shouldFailRebuild) {
      throw new Error('GDS unavailable');
    }

    return {
      ...this.rebuildResult,
      similarityCutoff: input.similarityCutoff,
      topK: input.topK
    };
  }
}

describe('ProjectService Fase 2 matchmaking', () => {
  it('devuelve candidatos de Fase 2 con pesos exactos, similares y complementarios', async () => {
    const repository = new FakeProjectRepository();
    repository.phaseTwoCandidates = [
      {
        userId: 'candidate-1',
        email: 'candidate@example.com',
        name: 'Candidate',
        score: 2.43,
        exactMatches: 1,
        similarMatches: 1,
        complementaryMatches: 1,
        skills: [
          {
            requiredSkill: 'React',
            matchedSkill: 'React',
            matchType: 'exact',
            semanticScore: 1,
            level: 4,
            score: 1.3
          }
        ]
      }
    ];
    const service = new ProjectService(repository);

    const result = await service.findPhaseTwoCandidates('user-1', ' project-1 ');

    expect(repository.lastPhaseTwoCall).toEqual({
      userId: 'user-1',
      projectId: 'project-1',
      weights: {
        exact: 1,
        similar: 0.65,
        complementary: 0.45
      }
    });
    expect(result).toEqual({
      candidates: repository.phaseTwoCandidates,
      weights: {
        exact: 1,
        similar: 0.65,
        complementary: 0.45
      }
    });
  });

  it('devuelve NotFound cuando el usuario no pertenece al proyecto solicitado', async () => {
    const repository = new FakeProjectRepository();
    repository.phaseTwoCandidates = null;
    const service = new ProjectService(repository);

    await expect(service.findPhaseTwoCandidates('user-1', 'project-404')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('valida y limita parametros de reconstruccion GDS antes de llegar al repositorio', async () => {
    const repository = new FakeProjectRepository();
    const service = new ProjectService(repository);

    const result = await service.rebuildSemanticIndex({
      similarityCutoff: 0.7,
      topK: 25
    });

    expect(repository.lastRebuildInput).toEqual({
      similarityCutoff: 0.7,
      topK: 25
    });
    expect(result).toMatchObject({
      similarityCutoff: 0.7,
      topK: 25
    });
  });

  it('rechaza parametros GDS fuera de rango sin ocultarlos como fallo de infraestructura', async () => {
    const repository = new FakeProjectRepository();
    const service = new ProjectService(repository);

    await expect(service.rebuildSemanticIndex({ similarityCutoff: 1.5, topK: 10 })).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.rebuildSemanticIndex({ similarityCutoff: 0.5, topK: 100 })).rejects.toBeInstanceOf(BadRequestError);
    expect(repository.lastRebuildInput).toBeNull();
  });

  it('normaliza fallos de GDS como error 503 controlado', async () => {
    const repository = new FakeProjectRepository();
    repository.shouldFailRebuild = true;
    const service = new ProjectService(repository);

    await expect(service.rebuildSemanticIndex({ similarityCutoff: 0.35, topK: 10 })).rejects.toMatchObject<AppError>({
      statusCode: 503,
      code: 'GDS_UNAVAILABLE'
    });
  });
});
