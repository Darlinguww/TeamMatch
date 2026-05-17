import { randomUUID } from 'crypto';
import { ConflictError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { SkillRepository } from './repositories/skill.repository.js';
import { CreateSkillInput, Skill, UpdateSkillInput } from './types/skill.types.js';

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

function isNeo4jConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';

  return code.includes('Constraint') || message.includes('constraint');
}

export class SkillService {
  public constructor(private readonly skillRepository: SkillRepository) {}

  public async list(): Promise<Skill[]> {
    return this.skillRepository.findAll();
  }

  public async get(skillId: string): Promise<Skill> {
    const skill = await this.skillRepository.findById(skillId);

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    return skill;
  }

  public async create(input: CreateSkillInput): Promise<Skill> {
    const normalizedName = normalizeSkillName(input.name);
    const existingSkill = await this.skillRepository.findByNormalizedName(normalizedName);

    if (existingSkill) {
      throw new ConflictError('Skill already exists');
    }

    const now = new Date().toISOString();

    try {
      return await this.skillRepository.create({
        skillId: randomUUID(),
        name: input.name.trim(),
        normalizedName,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      if (isNeo4jConstraintError(error)) {
        throw new ConflictError('Skill already exists');
      }

      throw error;
    }
  }

  public async update(skillId: string, input: UpdateSkillInput): Promise<Skill> {
    const normalizedName = normalizeSkillName(input.name);
    const existingSkill = await this.skillRepository.findByNormalizedName(normalizedName);

    if (existingSkill && existingSkill.skillId !== skillId) {
      throw new ConflictError('Skill already exists');
    }

    try {
      const updatedSkill = await this.skillRepository.update(
        skillId,
        input.name.trim(),
        normalizedName,
        new Date().toISOString()
      );

      if (!updatedSkill) {
        throw new NotFoundError('Skill not found');
      }

      return updatedSkill;
    } catch (error) {
      if (isNeo4jConstraintError(error)) {
        throw new ConflictError('Skill already exists');
      }

      throw error;
    }
  }

  public async delete(skillId: string): Promise<void> {
    const deleted = await this.skillRepository.delete(skillId);

    if (!deleted) {
      throw new NotFoundError('Skill not found');
    }
  }
}
