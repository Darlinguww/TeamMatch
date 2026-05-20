import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { SkillService } from './skill.service.js';
import { Skill } from './types/skill.types.js';

class FakeSkillRepository {
  public skills = new Map<string, Skill>();

  public async findAll(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  public async findById(skillId: string): Promise<Skill | null> {
    return this.skills.get(skillId) ?? null;
  }

  public async findByNormalizedName(normalizedName: string): Promise<Skill | null> {
    return Array.from(this.skills.values()).find((skill) => skill.normalizedName === normalizedName) ?? null;
  }

  public async create(skill: Skill): Promise<Skill> {
    this.skills.set(skill.skillId, skill);
    return skill;
  }

  public async update(skillId: string, name: string, normalizedName: string, updatedAt: string): Promise<Skill | null> {
    const existingSkill = this.skills.get(skillId);

    if (!existingSkill) {
      return null;
    }

    const updatedSkill = {
      ...existingSkill,
      name,
      normalizedName,
      updatedAt
    };
    this.skills.set(skillId, updatedSkill);
    return updatedSkill;
  }

  public async delete(skillId: string): Promise<boolean> {
    return this.skills.delete(skillId);
  }
}

let repository: FakeSkillRepository;
let service: SkillService;

describe('SkillService CRUD', () => {
  beforeEach(() => {
    repository = new FakeSkillRepository();
    service = new SkillService(repository);
  });

  it('crea una habilidad normalizando el nombre para unicidad', async () => {
    const skill = await service.create({ name: 'React' });

    expect(skill).toMatchObject({
      name: 'React',
      normalizedName: 'react'
    });
  });

  it('rechaza habilidades duplicadas sin distinguir mayusculas', async () => {
    await service.create({ name: 'React' });

    await expect(service.create({ name: 'react' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lista y obtiene habilidades existentes', async () => {
    const skill = await service.create({ name: 'TypeScript' });

    await expect(service.list()).resolves.toHaveLength(1);
    await expect(service.get(skill.skillId)).resolves.toMatchObject({ name: 'TypeScript' });
  });

  it('actualiza una habilidad existente', async () => {
    const skill = await service.create({ name: 'Node' });

    await expect(service.update(skill.skillId, { name: 'Node.js' })).resolves.toMatchObject({
      name: 'Node.js',
      normalizedName: 'node.js'
    });
  });

  it('elimina una habilidad existente', async () => {
    const skill = await service.create({ name: 'Docker' });

    await expect(service.delete(skill.skillId)).resolves.toBeUndefined();
    await expect(service.get(skill.skillId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
