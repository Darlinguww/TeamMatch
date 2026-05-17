import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { CreateProjectInput, ProjectDetails, ProjectRoleInput, ProjectSummary } from './types/project.types.js';

export interface ProjectRepository {
  findMissingSkillNames(skillNames: string[]): Promise<string[]>;
  createProject(leaderId: string, projectId: string, input: CreateProjectInput): Promise<void>;
  listProjectsForUser(userId: string): Promise<ProjectSummary[]>;
  findProjectForUser(userId: string, projectId: string): Promise<ProjectDetails | null>;
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
}
