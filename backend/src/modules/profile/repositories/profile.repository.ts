import { driver } from '../../../database/neo4j.js';
import { serializePublicProfile } from '../serializers/public-profile.serializer.js';
import { AvailabilityDayInput, PublicProfile, SkillExperienceInput, WEEKDAYS } from '../types/profile.types.js';

export class ProfileRepository {
  public async replaceUserExperience(userId: string, experience: SkillExperienceInput[]): Promise<PublicProfile | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    let userExists = false;

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
         RETURN u.userId AS userId`,
        { userId, experience, updatedAt }
      );

      userExists = result.records.length > 0;
    } finally {
      await session.close();
    }

    return userExists ? this.findPublicProfileByUserId(userId) : null;
  }

  public async replaceUserAvailability(userId: string, availability: AvailabilityDayInput[]): Promise<PublicProfile | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    let userExists = false;

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[:DISPONIBLE_EN]->(oldAvailability:Disponibilidad)
         DETACH DELETE oldAvailability
         WITH u
         CALL {
           WITH u
           UNWIND $availability AS dayAvailability
           UNWIND dayAvailability.timeSlots AS slot
           CREATE (availability:Disponibilidad {
             day: dayAvailability.day,
             start: slot.start,
             end: slot.end,
             updatedAt: $updatedAt
           })
           CREATE (u)-[:DISPONIBLE_EN]->(availability)
           RETURN count(availability) AS createdAvailability
         }
         RETURN u.userId AS userId`,
        { userId, availability, updatedAt }
      );

      userExists = result.records.length > 0;
    } finally {
      await session.close();
    }

    return userExists ? this.findPublicProfileByUserId(userId) : null;
  }

  public async findPublicProfileByUserId(userId: string): Promise<PublicProfile | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         CALL {
           WITH u
           OPTIONAL MATCH (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill:Habilidad)
           WITH skill, experienceRel
           ORDER BY toLower(skill.name)
           RETURN [item IN collect(
             CASE
               WHEN skill IS NULL THEN null
               ELSE {
                 skillName: skill.name,
                 yearsOfExperience: experienceRel.yearsOfExperience,
                 level: experienceRel.level
               }
             END
           ) WHERE item IS NOT NULL] AS experience
         }
         CALL {
           WITH u
           OPTIONAL MATCH (u)-[:DISPONIBLE_EN]->(availability:Disponibilidad)
           WITH availability
           ORDER BY availability.start
           RETURN [item IN collect(
             CASE
               WHEN availability IS NULL THEN null
               ELSE {
                 day: availability.day,
                 start: availability.start,
                 end: availability.end
               }
             END
           ) WHERE item IS NOT NULL] AS availabilitySlots
         }
         WITH u, experience, availabilitySlots
         WITH u,
              experience,
              [day IN $weekdays
               WHERE size([slot IN availabilitySlots WHERE slot.day = day]) > 0 |
               {
                 day: day,
                 timeSlots: [slot IN availabilitySlots WHERE slot.day = day | {start: slot.start, end: slot.end}]
               }] AS availability
         RETURN u.userId AS userId,
                u.user AS user,
                experience,
                availability
         LIMIT 1`,
        { userId, weekdays: [...WEEKDAYS] }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return serializePublicProfile({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience'),
        availability: record.get('availability')
      });
    } finally {
      await session.close();
    }
  }
}
