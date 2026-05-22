import { randomUUID } from 'crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectMatchWeights,
  ProjectPhaseOneCandidate,
  ProjectPhaseTwoCandidate,
  ProjectRoleInput,
  SemanticIndexRebuildInput,
  SemanticIndexRebuildResult,
  ProjectKanbanState,
  ProjectSummary,
  UpdateProjectKanbanInput
} from './types/project.types.js';

const EXACT_SKILL_WEIGHT = 1;
const SIMILAR_SKILL_WEIGHT = 0.65;
const COMPLEMENTARY_SKILL_WEIGHT = 0.45;
const DEFAULT_SIMILARITY_CUTOFF = 0.35;
const DEFAULT_TOP_K = 10;
const MIN_TOP_K = 1;
const MAX_TOP_K = 50;

/** Combina entradas con el mismo nombre de rol sumando vacantes y uniendo skills. */
export function mergeProjectRoles(roles: ProjectRoleInput[]): ProjectRoleInput[] {
  const merged = new Map<string, ProjectRoleInput>();

  for (const role of roles) {
    const name = role.role.trim();
    const key = name.toLowerCase();
    const headcount = Math.max(1, Math.min(20, role.headcount ?? 1));
    const skills = [...new Set(role.skills.map((s) => s.trim()).filter(Boolean))];
    const existing = merged.get(key);

    if (existing) {
      existing.headcount = Math.min(20, (existing.headcount ?? 1) + headcount);
      existing.skills = [...new Set([...existing.skills, ...skills])];
      continue;
    }

    merged.set(key, { role: name, skills, headcount });
  }

  return Array.from(merged.values());
}

export interface ProjectRepository {
  findMissingSkillNames(skillNames: string[]): Promise<string[]>;
  createProject(leaderId: string, projectId: string, input: CreateProjectInput): Promise<void>;
  listProjectsForUser(userId: string): Promise<ProjectSummary[]>;
  findProjectForUser(userId: string, projectId: string): Promise<ProjectDetails | null>;
  findOpenProjectById(projectId: string): Promise<ProjectDetails | null>;
  listOpenProjects(userId: string): Promise<ProjectSummary[]>;
  addMemberToOpenProject(userId: string, projectId: string): Promise<boolean>;
  updateProject(
    userId: string,
    projectId: string,
    input: {
      title: string;
      description: string;
      roles?: ProjectRoleInput[];
      categories?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
      estimatedDuration?: number;
    }
  ): Promise<ProjectDetails>;
  findPhaseOneCandidates(userId: string, projectId: string): Promise<ProjectPhaseOneCandidate[] | null>;
  findPhaseTwoCandidates(userId: string, projectId: string, weights: ProjectMatchWeights): Promise<ProjectPhaseTwoCandidate[] | null>;
  rebuildSemanticIndex(input: { similarityCutoff: number; topK: number }): Promise<SemanticIndexRebuildResult>;
  // New methods for feedback and project lifecycle
  findProjectLeader(projectId: string): Promise<string | null>;
  setProjectStatusAndFeedback(projectId: string, status: string, feedbackEnabled: boolean, feedbackStart: string | null, feedbackEnd: string | null): Promise<void>;
  isUserMemberOfProject(userId: string, projectId: string): Promise<boolean>;
  hasFeedbackBetweenUsers(projectId: string, fromUserId: string, toUserId: string): Promise<boolean>;
  createFeedbackRelationship(projectId: string, fromUserId: string, toUserId: string, score: number, comment: string | null, createdAt: string): Promise<void>;
  updateProjectKanban(userId: string, projectId: string, input: UpdateProjectKanbanInput): Promise<ProjectKanbanState>;
}

export class ProjectService {
  public constructor(private readonly repository: ProjectRepository) {}

  public async createProject(
    leaderId: string,
    input: {
      title?: unknown;
      description?: unknown;
      roles?: unknown;
      categories?: unknown;
      difficulty?: unknown;
      estimatedDuration?: unknown;
    }
  ): Promise<{ projectId: string }> {
    const title = this.parseTitle(input.title);
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const roles = this.parseRoles(input.roles);
    const categories = this.parseCategories(input.categories);
    const difficulty = this.parseDifficulty(input.difficulty);
    const estimatedDuration = this.parseEstimatedDuration(input.estimatedDuration);

    const projectId = randomUUID();
    await this.repository.createProject(leaderId, projectId, {
      title,
      description,
      roles,
      categories,
      difficulty,
      estimatedDuration,
    });

    return { projectId };
  }

  public async listProjects(userId: string): Promise<ProjectSummary[]> {
    return this.repository.listProjectsForUser(userId);
  }

  public async listOpenProjects(userId: string): Promise<ProjectSummary[]> {
    return this.repository.listOpenProjects(userId);
  }

  public async getProject(userId: string, projectId: string): Promise<ProjectDetails> {
    const normalizedProjectId = projectId.trim();
    const memberProject = await this.repository.findProjectForUser(userId, normalizedProjectId);
    if (memberProject) {
      return memberProject;
    }

    const openProject = await this.repository.findOpenProjectById(normalizedProjectId);
    if (openProject) {
      return openProject;
    }

    throw new NotFoundError('Project not found');
  }

  public async joinOpenProject(userId: string, projectId: string): Promise<ProjectDetails> {
    const normalizedProjectId = projectId.trim();

    if (await this.repository.isUserMemberOfProject(userId, normalizedProjectId)) {
      const existing = await this.repository.findProjectForUser(userId, normalizedProjectId);
      if (existing) {
        return existing;
      }
    }

    const added = await this.repository.addMemberToOpenProject(userId, normalizedProjectId);
    if (!added) {
      throw new NotFoundError('Open project not found or not available to join');
    }

    const joined = await this.repository.findProjectForUser(userId, normalizedProjectId);
    if (!joined) {
      throw new NotFoundError('Project not found after join');
    }

    return joined;
  }

  public async updateProject(
    userId: string,
    projectId: string,
    input: {
      title?: unknown;
      description?: unknown;
      roles?: unknown;
      categories?: unknown;
      difficulty?: unknown;
      estimatedDuration?: unknown;
    }
  ): Promise<ProjectDetails> {
    const normalizedProjectId = projectId.trim();
    const currentProject = await this.repository.findProjectForUser(userId, normalizedProjectId);

    if (!currentProject) {
      throw new NotFoundError('Project not found');
    }

    const leaderId =
      currentProject.leader?.userId ??
      (await this.repository.findProjectLeader(normalizedProjectId));
    if (!leaderId || leaderId !== userId) {
      throw new ForbiddenError('Only project leaders can update projects');
    }

    const title = typeof input.title === 'string' ? input.title.trim() : currentProject.title;
    const description =
      typeof input.description === 'string' ? input.description.trim() : currentProject.description;

    if (!title) {
      throw new BadRequestError('Titulo es requerido');
    }

    let roles: ProjectRoleInput[] | undefined;
    if (input.roles !== undefined && input.roles !== null && Array.isArray(input.roles) && input.roles.length > 0) {
      roles = this.parseRoles(input.roles);
    }

    let categories: string[] | undefined;
    if (input.categories !== undefined && input.categories !== null) {
      categories = this.parseCategories(input.categories);
    }

    let difficulty: 'easy' | 'medium' | 'hard' | undefined;
    if (input.difficulty !== undefined && input.difficulty !== null && input.difficulty !== '') {
      difficulty = this.parseDifficulty(input.difficulty);
    }

    let estimatedDuration: number | undefined;
    if (input.estimatedDuration !== undefined && input.estimatedDuration !== null && input.estimatedDuration !== '') {
      estimatedDuration = this.parseEstimatedDuration(input.estimatedDuration);
    }

    return this.repository.updateProject(userId, normalizedProjectId, {
      title,
      description,
      roles,
      categories,
      difficulty,
      estimatedDuration,
    });
  }

  public async updateProjectKanban(
    userId: string,
    projectId: string,
    input: { sprintActive?: unknown; currentSprint?: unknown }
  ): Promise<ProjectKanbanState> {
    const currentProject = await this.repository.findProjectForUser(userId, projectId.trim());

    if (!currentProject) {
      throw new NotFoundError('Project not found');
    }

    if (currentProject.leader.userId !== userId) {
      throw new ForbiddenError('Only project leaders can update Kanban sprint state');
    }

    const sprintActive = input.sprintActive === true;
    const currentSprint = this.parseCurrentSprint(input.currentSprint, currentProject.kanban.currentSprint);

    return this.repository.updateProjectKanban(userId, projectId.trim(), {
      sprintActive,
      currentSprint
    });
  }

  private parseCurrentSprint(value: unknown, fallback: number): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      throw new BadRequestError('currentSprint debe ser un entero entre 1 y 99');
    }

    return parsed;
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

  private parseCategories(value: unknown): string[] {
    if (value === undefined || value === null) {
      return ['General'];
    }

    const raw = Array.isArray(value) ? value : [value];
    const categories = raw
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim());

    if (categories.length === 0) {
      throw new BadRequestError('Debe indicar al menos una categoría');
    }

    const seen = new Set<string>();
    return categories.filter((category) => {
      const key = category.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private parseDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
    if (value === undefined || value === null || value === '') {
      return 'medium';
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'easy' || normalized === 'hard' || normalized === 'medium') {
      return normalized;
    }
    throw new BadRequestError('difficulty debe ser easy, medium o hard');
  }

  private parseEstimatedDuration(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return 4;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
      throw new BadRequestError('estimatedDuration debe ser un entero entre 1 y 52');
    }
    return parsed;
  }

  private parseRoles(value: unknown): ProjectRoleInput[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestError('Debe definir al menos un rol');
    }

    const parsed = value.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestError(`Rol invalido en la posicion ${index}`);
      }

      const rawRole = item as { role?: unknown; skills?: unknown; headcount?: unknown };
      const role = typeof rawRole.role === 'string' ? rawRole.role.trim() : '';
      if (!role) {
        throw new BadRequestError(`El nombre del rol es requerido en la posicion ${index}`);
      }

      const skills = Array.isArray(rawRole.skills)
        ? rawRole.skills
            .filter((skill): skill is string => typeof skill === 'string' && Boolean(skill.trim()))
            .map((skill) => skill.trim())
        : [];

      let headcount = 1;
      if (rawRole.headcount !== undefined && rawRole.headcount !== null && rawRole.headcount !== '') {
        const parsedHeadcount = Number(rawRole.headcount);
        if (!Number.isInteger(parsedHeadcount) || parsedHeadcount < 1 || parsedHeadcount > 20) {
          throw new BadRequestError(`El rol '${role}' debe tener headcount entre 1 y 20`);
        }
        headcount = parsedHeadcount;
      }

      return { role, skills, headcount };
    });

    return mergeProjectRoles(parsed);
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
