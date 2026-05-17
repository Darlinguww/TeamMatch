import { driver } from '../../../database/neo4j.js';
import { serializePublicProfile, serializePublicProfileSearchResult } from '../serializers/public-profile.serializer.js';
import {
  AvailabilityDayInput,
  PublicProfile,
  PublicProfileSearchResult,
  SearchUsersFilters,
  SkillExperienceInput,
  WEEKDAYS
} from '../types/profile.types.js';

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
           MERGE (skill:Habilidad {normalizedName: item.normalizedSkillName})
           ON CREATE SET skill.name = item.skillName,
                         skill.createdAt = $updatedAt
           SET skill.updatedAt = $updatedAt
           MERGE (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill)
           SET experienceRel.yearsOfExperience = item.yearsOfExperience,
               experienceRel.level = item.level,
               experienceRel.updatedAt = $updatedAt
           RETURN count(experienceRel) AS updatedRelationships
         }
         RETURN u.userId AS userId`,
        {
          userId,
          experience: experience.map((item) => ({
            ...item,
            normalizedSkillName: item.skillName.trim().toLowerCase()
          })),
          updatedAt
        }
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

  public async searchPublicProfiles(filters: SearchUsersFilters): Promise<PublicProfileSearchResult[]> {
    const session = driver.session();
    const hasAvailabilityFilter = filters.availability !== null;

    try {
      const result = await session.run(
        `MATCH (u:Usuario)
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
         WITH u,
              experience,
              availabilitySlots,
              [item IN experience
               WHERE (size($skills) = 0 OR toLower(item.skillName) IN $skills)
                 AND ($minYears IS NULL OR item.yearsOfExperience >= $minYears)] AS matchingExperience
         WITH u,
              experience,
              availabilitySlots,
              matchingExperience,
              CASE
                WHEN $hasAvailabilityFilter = false THEN true
                ELSE size([slot IN availabilitySlots
                           WHERE slot.day = $availabilityDay
                             AND slot.start <= $availabilityStart
                             AND slot.end >= $availabilityEnd]) > 0
              END AS availabilityMatched
         WITH u,
              experience,
              availabilitySlots,
              matchingExperience,
              availabilityMatched,
              size(matchingExperience) AS matchingSkills,
              reduce(total = 0.0, item IN matchingExperience | total + coalesce(item.yearsOfExperience, 0.0)) AS totalMatchingYears
         WHERE ((size($skills) = 0 AND $minYears IS NULL) OR matchingSkills > 0)
           AND availabilityMatched
         WITH u,
              experience,
              availabilitySlots,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              (matchingSkills * 100.0) +
              (totalMatchingYears * 10.0) +
              CASE WHEN $hasAvailabilityFilter = true AND availabilityMatched THEN 50.0 ELSE 0.0 END AS score
         WITH u,
              experience,
              [day IN $weekdays
               WHERE size([slot IN availabilitySlots WHERE slot.day = day]) > 0 |
               {
                 day: day,
                 timeSlots: [slot IN availabilitySlots WHERE slot.day = day | {start: slot.start, end: slot.end}]
               }] AS availability,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              score
         RETURN u.userId AS userId,
                u.user AS user,
                experience,
                availability,
                {
                  matchingSkills: matchingSkills,
                  totalMatchingYears: totalMatchingYears,
                  availabilityMatched: availabilityMatched,
                  score: score
                } AS match
         ORDER BY score DESC, matchingSkills DESC, totalMatchingYears DESC, toLower(u.user), u.userId
         SKIP $offset
         LIMIT $limit`,
        {
          skills: filters.skills,
          minYears: filters.minYears,
          hasAvailabilityFilter,
          availabilityDay: filters.availability?.day ?? null,
          availabilityStart: filters.availability?.start ?? null,
          availabilityEnd: filters.availability?.end ?? null,
          weekdays: [...WEEKDAYS],
          offset: filters.offset,
          limit: filters.limit
        }
      );

      return result.records.map((record) => serializePublicProfileSearchResult({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience'),
        availability: record.get('availability'),
        match: record.get('match')
      }));
    } finally {
      await session.close();
    }
  }
}
