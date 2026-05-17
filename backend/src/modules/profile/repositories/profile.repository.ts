import { driver } from '../../../database/neo4j.js';
import { serializePublicProfile } from '../serializers/public-profile.serializer.js';
import { PublicProfile, SkillExperienceInput } from '../types/profile.types.js';

export class ProfileRepository {
  public async replaceUserExperience(userId: string, experience: SkillExperienceInput[]): Promise<PublicProfile | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[oldExperience:TIENE_EXPERIENCIA_EN]->(:Habilidad)
         DELETE oldExperience
         WITH u
         CALL {
           WITH u
           UNWIND $experience AS item
           MERGE (skill:Habilidad {name: item.skillName})
           MERGE (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill)
           SET experienceRel.yearsOfExperience = item.yearsOfExperience,
               experienceRel.level = item.level,
               experienceRel.updatedAt = $updatedAt
           RETURN count(experienceRel) AS updatedRelationships
         }
         WITH u
         OPTIONAL MATCH (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill:Habilidad)
         WITH u, skill, experienceRel
         ORDER BY toLower(skill.name)
         RETURN u.userId AS userId,
                u.user AS user,
                [item IN collect(
                  CASE
                    WHEN skill IS NULL THEN null
                    ELSE {
                      skillName: skill.name,
                      yearsOfExperience: experienceRel.yearsOfExperience,
                      level: experienceRel.level
                    }
                  END
                ) WHERE item IS NOT NULL] AS experience`,
        { userId, experience, updatedAt }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return serializePublicProfile({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience')
      });
    } finally {
      await session.close();
    }
  }

  public async findPublicProfileByUserId(userId: string): Promise<PublicProfile | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill:Habilidad)
         WITH u, skill, experienceRel
         ORDER BY toLower(skill.name)
         RETURN u.userId AS userId,
                u.user AS user,
                [item IN collect(
                  CASE
                    WHEN skill IS NULL THEN null
                    ELSE {
                      skillName: skill.name,
                      yearsOfExperience: experienceRel.yearsOfExperience,
                      level: experienceRel.level
                    }
                  END
                ) WHERE item IS NOT NULL] AS experience
         LIMIT 1`,
        { userId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return serializePublicProfile({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience')
      });
    } finally {
      await session.close();
    }
  }
}
