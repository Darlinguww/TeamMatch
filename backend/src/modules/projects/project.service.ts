import { randomUUID } from 'crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectMatchWeights,
  ProjectPhaseOneCandidate,
  ProjectPhaseTwoCandidate,
  ProjectRoleInput,
  SemanticIndexRebuildInput,
  SemanticIndexRebuildResult,
  ProjectSummary
} from './types/project.types.js';

const EXACT_SKILL_WEIGHT = 1;
const SIMILAR_SKILL_WEIGHT = 0.65;
const COMPLEMENTARY_SKILL_WEIGHT = 0.45;
const DEFAULT_SIMILARITY_CUTOFF = 0.35;
const DEFAULT_TOP_K = 10;
const MIN_TOP_K = 1;
const MAX_TOP_K = 50;

export interface ProjectRepository {
  findMissingSkillNames(skillNames: string[]): Promise<string[]>;
  createProject(leaderId: string, projectId: string, input: CreateProjectInput): Promise<void>;
  listProjectsForUser(userId: string): Promise<ProjectSummary[]>;
  findProjectForUser(userId: string, projectId: string): Promise<ProjectDetails | null>;
  findPhaseOneCandidates(userId: string, projectId: string): Promise<ProjectPhaseOneCandidate[] | null>;
  findPhaseTwoCandidates(userId: string, projectId: string, weights: ProjectMatchWeights): Promise<ProjectPhaseTwoCandidate[] | null>;
  rebuildSemanticIndex(input: { similarityCutoff: number; topK: number }): Promise<SemanticIndexRebuildResult>;
  // New methods for feedback and project lifecycle
  findProjectLeader(projectId: string): Promise<string | null>;
  setProjectStatusAndFeedback(projectId: string, status: string, feedbackEnabled: boolean, feedbackStart: string | null, feedbackEnd: string | null): Promise<void>;
  isUserMemberOfProject(userId: string, projectId: string): Promise<boolean>;
  hasFeedbackBetweenUsers(projectId: string, fromUserId: string, toUserId: string): Promise<boolean>;
  createFeedbackRelationship(projectId: string, fromUserId: string, toUserId: string, score: number, comment: string | null, createdAt: string): Promise<void>;
}

export class ProjectService {
  public constructor(private readonly repository: ProjectRepository) {}

  public async createProject(
    leaderId: string,
    input: { title?: unknown; description?: unknown; roles?: unknown }
  ): Promise<{ projectId: string }> {
    const title = this.parseTitle(input.title);
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const roles = this.parseRoles(input.roles);
    const missingSkills = await this.repository.findMissingSkillNames([...new Set(roles.flatMap((role) => role.skills))]);

    if (missingSkills.length > 0) {
      throw new BadRequestError(`Las siguientes habilidades no existen: ${missingSkills.join(', ')}`);
    }

    const projectId = randomUUID();
    await this.repository.createProject(leaderId, projectId, { title, description, roles });

    return { projectId };
  }

  public async listProjects(userId: string): Promise<ProjectSummary[]> {
    return this.repository.listProjectsForUser(userId);
  }

  public async getProject(userId: string, projectId: string): Promise<ProjectDetails> {
    const project = await this.repository.findProjectForUser(userId, projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  public async findPhaseOneCandidates(userId: string, projectId: string): Promise<ProjectPhaseOneCandidate[]> {
    const candidates = await this.repository.findPhaseOneCandidates(userId, projectId.trim());

    if (!candidates) {
      throw new NotFoundError('Project not found');
    }

    return candidates;
  }

  public async findPhaseTwoCandidates(userId: string, projectId: string): Promise<{
    candidates: ProjectPhaseTwoCandidate[];
    weights: ProjectMatchWeights;
  }> {
    const weights = {
      exact: EXACT_SKILL_WEIGHT,
      similar: SIMILAR_SKILL_WEIGHT,
      complementary: COMPLEMENTARY_SKILL_WEIGHT
    };
    const candidates = await this.repository.findPhaseTwoCandidates(userId, projectId.trim(), weights);

    if (!candidates) {
      throw new NotFoundError('Project not found');
    }

    return { candidates, weights };
  }

  public async rebuildSemanticIndex(input: SemanticIndexRebuildInput): Promise<SemanticIndexRebuildResult> {
    const rebuildInput = {
      similarityCutoff: this.parseSimilarityCutoff(input.similarityCutoff),
      topK: this.parseTopK(input.topK)
    };

    try {
      return await this.repository.rebuildSemanticIndex(rebuildInput);
    } catch (error) {
      console.error('ProjectService.rebuildSemanticIndex', error);
      throw new AppError('No se pudo recalcular el indice semantico con GDS', 503, 'GDS_UNAVAILABLE');
    }
  }

  private parseTitle(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError('Titulo es requerido');
    }

    return value.trim();
  }

  private parseRoles(value: unknown): ProjectRoleInput[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestError('Debe definir al menos un rol');
    }

    return value.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestError(`Rol invalido en la posicion ${index}`);
      }

      const rawRole = item as { role?: unknown; skills?: unknown };
      const role = typeof rawRole.role === 'string' ? rawRole.role.trim() : '';
      if (!role) {
        throw new BadRequestError(`El nombre del rol es requerido en la posicion ${index}`);
      }

      if (!Array.isArray(rawRole.skills) || rawRole.skills.length === 0) {
        throw new BadRequestError(`El rol '${role}' debe incluir al menos una skill`);
      }

      const skills = rawRole.skills
        .filter((skill): skill is string => typeof skill === 'string' && Boolean(skill.trim()))
        .map((skill) => skill.trim());

      if (skills.length === 0) {
        throw new BadRequestError(`El rol '${role}' debe incluir al menos una skill valida`);
      }

      return { role, skills };
    });
  }

  private parseSimilarityCutoff(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return DEFAULT_SIMILARITY_CUTOFF;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
      throw new BadRequestError('similarityCutoff debe ser un numero entre 0 y 1');
    }

    return numericValue;
  }

  private parseTopK(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return DEFAULT_TOP_K;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < MIN_TOP_K || numericValue > MAX_TOP_K) {
      throw new BadRequestError(`topK debe ser un entero entre ${MIN_TOP_K} y ${MAX_TOP_K}`);
    }

    return numericValue;
  }
}
