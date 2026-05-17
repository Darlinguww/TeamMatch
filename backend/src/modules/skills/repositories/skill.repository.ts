import { driver } from '../../../database/neo4j.js';
import { Skill } from '../types/skill.types.js';

function mapSkillRecord(record: { get(key: string): unknown }): Skill {
  return {
    skillId: String(record.get('skillId')),
    name: String(record.get('name')),
    normalizedName: String(record.get('normalizedName')),
    createdAt: String(record.get('createdAt')),
    updatedAt: String(record.get('updatedAt'))
  };
}

export class SkillRepository {
  public async findAll(): Promise<Skill[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (s:Habilidad)
         RETURN s.skillId AS skillId,
                s.name AS name,
                s.normalizedName AS normalizedName,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt
         ORDER BY toLower(s.name)`
      );

      return result.records.map(mapSkillRecord);
    } finally {
      await session.close();
    }
  }

  public async findById(skillId: string): Promise<Skill | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (s:Habilidad {skillId: $skillId})
         RETURN s.skillId AS skillId,
                s.name AS name,
                s.normalizedName AS normalizedName,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt
         LIMIT 1`,
        { skillId }
      );

      return result.records.length > 0 ? mapSkillRecord(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async findByNormalizedName(normalizedName: string): Promise<Skill | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (s:Habilidad {normalizedName: $normalizedName})
         RETURN s.skillId AS skillId,
                s.name AS name,
                s.normalizedName AS normalizedName,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt
         LIMIT 1`,
        { normalizedName }
      );

      return result.records.length > 0 ? mapSkillRecord(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async create(skill: Skill): Promise<Skill> {
    const session = driver.session();

    try {
      const result = await session.run(
        `CREATE (s:Habilidad {
           skillId: $skillId,
           name: $name,
           normalizedName: $normalizedName,
           createdAt: $createdAt,
           updatedAt: $updatedAt
         })
         RETURN s.skillId AS skillId,
                s.name AS name,
                s.normalizedName AS normalizedName,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt`,
        skill
      );

      return mapSkillRecord(result.records[0]);
    } finally {
      await session.close();
    }
  }

  public async update(skillId: string, name: string, normalizedName: string, updatedAt: string): Promise<Skill | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (s:Habilidad {skillId: $skillId})
         SET s.name = $name,
             s.normalizedName = $normalizedName,
             s.updatedAt = $updatedAt
         RETURN s.skillId AS skillId,
                s.name AS name,
                s.normalizedName AS normalizedName,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt`,
        { skillId, name, normalizedName, updatedAt }
      );

      return result.records.length > 0 ? mapSkillRecord(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async delete(skillId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (s:Habilidad {skillId: $skillId})
         WITH s
         DETACH DELETE s
         RETURN count(s) AS deletedCount`,
        { skillId }
      );

      return Number(result.records[0]?.get('deletedCount') ?? 0) > 0;
    } finally {
      await session.close();
    }
  }
}
