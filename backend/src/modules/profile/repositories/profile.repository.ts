import { driver } from '../../../database/neo4j.js';
import { serializePublicProfile, serializePublicProfileSearchResult } from '../serializers/public-profile.serializer.js';
import {
  AvailabilityDayInput,
  PublicProfile,
  PublicProfileSearchResult,
  SKILL_CATEGORIES,
  SearchUsersFilters,
  SkillExperienceInput,
  WEEKDAYS,
  type SkillCategory
} from '../types/profile.types.js';

const NEUTRAL_ONBOARDING_SCORE = 50.0;
const DOMAIN_SKILL_WEIGHT = 10.0;
const MAX_DOMAIN_WEIGHT = 20.0;
const MAX_DOMAIN_WEIGHT_BONUS = 40.0;
const MIN_EVALUATION_SCORE = 0.0;
const MAX_EVALUATION_SCORE = 5.0;
const MAX_REPUTATION_WEIGHT = 0.2;
const DEFAULT_SKILL_CATEGORY: SkillCategory = 'other';
const CATEGORY_SKILL_WEIGHT = 5.0;
const MAX_CATEGORY_WEIGHT_BONUS = 15.0;

function normalizeSkillName(skillName: string): string {
  return skillName.trim().toLowerCase();
}

const SKILL_CATEGORY_KEYWORDS = {
  frontend: ['react', 'react.js', 'vue', 'vue.js', 'angular', 'css', 'html', 'javascript', 'typescript'],
  backend: ['node.js', 'nodejs', 'express', 'spring', 'django', 'java', 'c#', '.net', 'php', 'ruby', 'go'],
  mobile: ['flutter', 'react native', 'kotlin', 'swift', 'android', 'ios'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'jenkins', 'github actions'],
  data: ['python', 'sql', 'postgresql', 'mysql', 'mongodb', 'neo4j', 'tensorflow', 'pytorch', 'machine learning', 'data analysis'],
  design: ['figma', 'ui design', 'ux design', 'photoshop', 'illustrator', 'wireframing', 'prototyping'],
  humanities: ['writing', 'research', 'translation', 'history', 'philosophy', 'literature', 'communication'],
  'social-work': ['social work', 'community management', 'case management', 'counseling', 'psychology', 'volunteering'],
  management: ['project management', 'scrum', 'agile', 'leadership', 'planning', 'product management'],
  marketing: ['seo', 'content marketing', 'copywriting', 'analytics', 'branding', 'campaign management'],
  qa: ['qa', 'testing', 'test automation', 'selenium', 'cypress', 'playwright', 'jest', 'vitest']
} satisfies Record<Exclude<SkillCategory, 'other'>, string[]>;

const SKILL_CATEGORY_RULES = Object.entries(SKILL_CATEGORY_KEYWORDS).map(([category, skills]) => ({
  category,
  skills: skills.map(normalizeSkillName)
}));

const TECHNOLOGY_DOMAIN_SKILLS = {
  frontend: ['react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript'],
  backend: ['node.js', 'nodejs', 'express', 'spring', 'django', 'java'],
  mobile: ['flutter', 'react native', 'kotlin', 'swift'],
  ai: ['python', 'tensorflow', 'pytorch', 'machine learning'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp']
} as const;

const TECHNOLOGY_DOMAIN_WEIGHTS = Object.entries(TECHNOLOGY_DOMAIN_SKILLS).map(([domain, skills]) => ({
  domain,
  skills: [...skills],
  perSkillWeight: DOMAIN_SKILL_WEIGHT,
  maxDomainWeight: MAX_DOMAIN_WEIGHT
}));

export class ProfileRepository {
  public async replaceUserSkills(userId: string, skills: string[]): Promise<PublicProfile | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    const normalizedSkills = skills.map((skillName) => ({
      skillName,
      normalizedSkillName: skillName.trim().toLowerCase()
    }));
    let userExists = false;

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[oldSkill:TIENE_HABILIDAD]->(:Habilidad)
         DELETE oldSkill
         WITH DISTINCT u
         FOREACH (item IN $skills |
           MERGE (skill:Habilidad {normalizedName: item.normalizedSkillName})
           ON CREATE SET skill.name = item.skillName,
                         skill.createdAt = $updatedAt
           SET skill.updatedAt = $updatedAt
           MERGE (u)-[skillRel:TIENE_HABILIDAD]->(skill)
           SET skillRel.updatedAt = $updatedAt
         )
         RETURN u.userId AS userId`,
        { userId, skills: normalizedSkills, updatedAt }
      );

      userExists = result.records.length > 0;
    } finally {
      await session.close();
    }

    return userExists ? this.findPublicProfileByUserId(userId) : null;
  }

  /** Keeps TIENE_EXPERIENCIA_EN aligned with profile skills (matchmaking Phase 1 uses both). */
  public async syncExperienceFromProfileSkills(userId: string, skills: string[]): Promise<void> {
    if (skills.length === 0) {
      return;
    }

    const session = driver.session();
    const updatedAt = new Date().toISOString();

    try {
      await session.run(
        `MATCH (u:Usuario {userId: $userId})
         UNWIND $skills AS skillName
         WITH u, trim(skillName) AS rawName
         WHERE rawName <> ''
         MERGE (skill:Habilidad {normalizedName: toLower(rawName)})
         ON CREATE SET skill.name = rawName,
                       skill.createdAt = $updatedAt
         SET skill.updatedAt = $updatedAt
         MERGE (u)-[exp:TIENE_EXPERIENCIA_EN]->(skill)
         ON CREATE SET exp.yearsOfExperience = 2.0,
                       exp.level = 'intermediate',
                       exp.updatedAt = $updatedAt`,
        { userId, skills, updatedAt }
      );
    } finally {
      await session.close();
    }
  }

  public async replaceUserExperience(userId: string, experience: SkillExperienceInput[]): Promise<PublicProfile | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    let userExists = false;

    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[oldExperience:TIENE_EXPERIENCIA_EN]->(:Habilidad)
         DELETE oldExperience
         WITH DISTINCT u
         FOREACH (item IN $experience |
           MERGE (skill:Habilidad {normalizedName: item.normalizedSkillName})
           ON CREATE SET skill.name = item.skillName,
                         skill.createdAt = $updatedAt
           SET skill.updatedAt = $updatedAt
           MERGE (u)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill)
           SET experienceRel.yearsOfExperience = item.yearsOfExperience,
               experienceRel.level = item.level,
               experienceRel.updatedAt = $updatedAt
         )
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
         WITH DISTINCT u
         FOREACH (dayAvailability IN $availability |
           FOREACH (slot IN dayAvailability.timeSlots |
             CREATE (availability:Disponibilidad {
               day: dayAvailability.day,
               start: slot.start,
               end: slot.end,
               updatedAt: $updatedAt
             })
             CREATE (u)-[:DISPONIBLE_EN]->(availability)
           )
         )
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
                 category: coalesce(head([categoryRule IN $skillCategoryRules
                                           WHERE toLower(skill.name) IN categoryRule.skills |
                                           categoryRule.category]), $defaultSkillCategory),
                 yearsOfExperience: experienceRel.yearsOfExperience,
                 level: experienceRel.level
               }
             END
           ) WHERE item IS NOT NULL] AS experience
         }
         CALL {
           WITH u
           OPTIONAL MATCH (u)-[:TIENE_HABILIDAD]->(skill:Habilidad)
           WITH skill
           ORDER BY toLower(skill.name)
           RETURN [name IN collect(skill.name) WHERE name IS NOT NULL] AS skills
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
         WITH u, experience, skills, availabilitySlots
         WITH u,
              experience,
              skills,
              [day IN $weekdays
               WHERE size([slot IN availabilitySlots WHERE slot.day = day]) > 0 |
               {
                 day: day,
                 timeSlots: [slot IN availabilitySlots WHERE slot.day = day | {start: slot.start, end: slot.end}]
               }] AS availability
         RETURN u.userId AS userId,
                u.user AS user,
                experience,
                skills,
                availability
         LIMIT 1`,
        {
          userId,
          skillCategoryRules: SKILL_CATEGORY_RULES,
          defaultSkillCategory: DEFAULT_SKILL_CATEGORY,
          weekdays: [...WEEKDAYS]
        }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return serializePublicProfile({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience'),
        skills: record.get('skills'),
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
                 category: coalesce(head([categoryRule IN $skillCategoryRules
                                           WHERE toLower(skill.name) IN categoryRule.skills |
                                           categoryRule.category]), $defaultSkillCategory),
                 yearsOfExperience: experienceRel.yearsOfExperience,
                 level: experienceRel.level
               }
             END
           ) WHERE item IS NOT NULL] AS experience
         }
         CALL {
           WITH u
           OPTIONAL MATCH (u)-[:TIENE_HABILIDAD]->(skill:Habilidad)
           WITH skill
           ORDER BY toLower(skill.name)
           RETURN [name IN collect(skill.name) WHERE name IS NOT NULL] AS confirmedSkills
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
              confirmedSkills,
              availabilitySlots,
              [item IN experience
               WHERE (size($skills) = 0 OR toLower(item.skillName) IN $skills)
                 AND ($minYears IS NULL OR item.yearsOfExperience >= $minYears)] AS matchingExperience
         WITH u,
              experience,
              confirmedSkills,
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
              confirmedSkills,
              availabilitySlots,
              matchingExperience,
              availabilityMatched,
              size(matchingExperience) AS matchingSkills,
              reduce(total = 0.0, item IN matchingExperience | total + coalesce(item.yearsOfExperience, 0.0)) AS totalMatchingYears,
              CASE
                WHEN size($skills) = 0 THEN 0.0
                ELSE toFloat(size([skill IN confirmedSkills WHERE NOT toLower(skill) IN $skills])) * 5.0
              END AS redundancyPenalty
         WHERE ((size($skills) = 0 AND $minYears IS NULL) OR matchingSkills > 0)
           AND availabilityMatched
         CALL {
           WITH u
           OPTIONAL MATCH (:Usuario)-[evaluation:EVALUO]->(u)
           WITH [rawScore IN collect(evaluation.puntaje) WHERE rawScore IS NOT NULL | coalesce(toFloat(rawScore), 0.0)] AS numericScores
           WITH [score IN numericScores |
             CASE
               WHEN score < $minEvaluationScore THEN $minEvaluationScore
               WHEN score > $maxEvaluationScore THEN $maxEvaluationScore
               ELSE score
             END
           ] AS boundedScores
           WITH CASE
             WHEN size(boundedScores) = 0 THEN 0.0
             ELSE reduce(total = 0.0, score IN boundedScores | total + score) / size(boundedScores)
           END AS averageReputationScore
           RETURN averageReputationScore / $maxEvaluationScore AS reputationScore
         }
         WITH u,
              experience,
              availabilitySlots,
              matchingExperience,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              reputationScore,
              [domainWeight IN $technologyDomainWeights |
               {
                 domain: domainWeight.domain,
                 weight: CASE
                   WHEN size([item IN matchingExperience WHERE toLower(item.skillName) IN domainWeight.skills]) * domainWeight.perSkillWeight > domainWeight.maxDomainWeight
                   THEN domainWeight.maxDomainWeight
                   ELSE size([item IN matchingExperience WHERE toLower(item.skillName) IN domainWeight.skills]) * domainWeight.perSkillWeight
                 END
               }] AS allDomainWeights
         WITH u,
              experience,
              availabilitySlots,
              matchingExperience,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              reputationScore,
              [domainWeight IN allDomainWeights WHERE domainWeight.weight > 0.0] AS domainWeights
         WITH u,
              experience,
              confirmedSkills,
              availabilitySlots,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              reputationScore,
              domainWeights,
              [category IN $skillCategories
               WHERE category <> $defaultSkillCategory
                 AND category IN [item IN matchingExperience | item.category]] AS matchingCategories
         WITH u,
              experience,
              availabilitySlots,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              reputationScore,
              domainWeights,
              matchingCategories,
              reduce(domainWeightBonus = 0.0, domainWeight IN domainWeights | domainWeightBonus + domainWeight.weight) AS domainWeightBonus
         WITH u,
              experience,
              availabilitySlots,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              reputationScore,
              domainWeights,
              matchingCategories,
              CASE
                WHEN size(matchingCategories) * $categorySkillWeight > $maxCategoryWeightBonus THEN $maxCategoryWeightBonus
                ELSE size(matchingCategories) * $categorySkillWeight
              END AS categoryWeightApplied,
              (size($skills) = 0 AND $minYears IS NULL AND size(experience) = 0) AS isNeutralScore,
              (matchingSkills * 100.0) +
              (totalMatchingYears * 10.0) +
              CASE WHEN $hasAvailabilityFilter = true AND availabilityMatched THEN 50.0 ELSE 0.0 END +
              CASE
                WHEN domainWeightBonus > $maxDomainWeightBonus THEN $maxDomainWeightBonus
                ELSE domainWeightBonus
              END +
              CASE
                WHEN size(matchingCategories) * $categorySkillWeight > $maxCategoryWeightBonus THEN $maxCategoryWeightBonus
                ELSE size(matchingCategories) * $categorySkillWeight
              END -
              redundancyPenalty AS rawScore
         WITH u,
              experience,
              confirmedSkills,
              [day IN $weekdays
               WHERE size([slot IN availabilitySlots WHERE slot.day = day]) > 0 |
               {
                 day: day,
                 timeSlots: [slot IN availabilitySlots WHERE slot.day = day | {start: slot.start, end: slot.end}]
               }] AS availability,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              isNeutralScore,
              matchingCategories,
              categoryWeightApplied,
              reputationScore,
              domainWeights,
              CASE
                WHEN isNeutralScore AND rawScore < $neutralOnboardingScore THEN $neutralOnboardingScore
                ELSE rawScore
              END AS baseScore
         WITH u,
              experience,
              availability,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              isNeutralScore,
              matchingCategories,
              categoryWeightApplied,
              reputationScore,
              domainWeights,
              baseScore * $maxReputationWeight * reputationScore AS reputationWeightApplied,
              baseScore
         WITH u,
              experience,
              availability,
              matchingSkills,
              totalMatchingYears,
              availabilityMatched,
              redundancyPenalty,
              isNeutralScore,
              matchingCategories,
              categoryWeightApplied,
              reputationScore,
              reputationWeightApplied,
              domainWeights,
              baseScore + reputationWeightApplied AS score
         RETURN u.userId AS userId,
                u.user AS user,
                experience,
                confirmedSkills AS skills,
                availability,
                {
                  matchingSkills: matchingSkills,
                  totalMatchingYears: totalMatchingYears,
                  availabilityMatched: availabilityMatched,
                  redundancyPenalty: redundancyPenalty,
                  score: score,
                  matchingCategories: matchingCategories,
                  categoryWeightApplied: categoryWeightApplied,
                  reputationScore: reputationScore,
                  reputationWeightApplied: reputationWeightApplied,
                  isNeutralScore: isNeutralScore,
                  domainWeights: domainWeights
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
          skillCategoryRules: SKILL_CATEGORY_RULES,
          skillCategories: [...SKILL_CATEGORIES],
          defaultSkillCategory: DEFAULT_SKILL_CATEGORY,
          categorySkillWeight: CATEGORY_SKILL_WEIGHT,
          maxCategoryWeightBonus: MAX_CATEGORY_WEIGHT_BONUS,
          technologyDomainWeights: TECHNOLOGY_DOMAIN_WEIGHTS,
          maxDomainWeightBonus: MAX_DOMAIN_WEIGHT_BONUS,
          minEvaluationScore: MIN_EVALUATION_SCORE,
          maxEvaluationScore: MAX_EVALUATION_SCORE,
          maxReputationWeight: MAX_REPUTATION_WEIGHT,
          weekdays: [...WEEKDAYS],
          neutralOnboardingScore: NEUTRAL_ONBOARDING_SCORE,
          offset: filters.offset,
          limit: filters.limit
        }
      );

      return result.records.map((record) => serializePublicProfileSearchResult({
        userId: record.get('userId'),
        user: record.get('user'),
        experience: record.get('experience'),
        availability: record.get('availability'),
        skills: record.get('skills'),
        match: record.get('match')
      }));
    } finally {
      await session.close();
    }
  }
}
