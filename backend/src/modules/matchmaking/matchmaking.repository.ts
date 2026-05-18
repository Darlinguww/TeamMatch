import { driver } from '../../database/neo4j.js';
import { SKILL_CATEGORIES } from '../profile/types/profile.types.js';
import type { SkillCategory } from '../profile/types/profile.types.js';
import type {
  MatchmakingCandidate,
  MatchmakingProjectContext,
  MatchmakingRoleRequirement,
  MatchmakingTeamMember
} from './matchmaking.types.js';

type RawRecord = Record<string, unknown>;

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

function normalizeSkillName(skillName: string): string {
  return skillName.trim().toLowerCase();
}

function classifySkillCategory(skillName: string, rawCategory: unknown): SkillCategory {
  if (typeof rawCategory === 'string' && rawCategory !== 'other' && SKILL_CATEGORIES.includes(rawCategory as SkillCategory)) {
    return rawCategory as SkillCategory;
  }

  const normalizedSkillName = normalizeSkillName(skillName);
  const category = Object.entries(SKILL_CATEGORY_KEYWORDS).find(([, skills]) => skills.includes(normalizedSkillName))?.[0];

  return category && SKILL_CATEGORIES.includes(category as SkillCategory)
    ? category as SkillCategory
    : 'other';
}

function serializeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function serializeExperienceItem(value: unknown): MatchmakingCandidate['experience'][number] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const item = value as RawRecord;
  const skillName = typeof item.skillName === 'string' ? item.skillName : '';
  const category = classifySkillCategory(skillName, item.category);

  if (!skillName) {
    return null;
  }

  return {
    skillName,
    category,
    yearsOfExperience: Number(item.yearsOfExperience ?? 0),
    level: typeof item.level === 'string' && item.level ? item.level : null
  };
}

function serializeExperience(value: unknown): MatchmakingCandidate['experience'] {
  return Array.isArray(value)
    ? value.map(serializeExperienceItem).filter((item): item is MatchmakingCandidate['experience'][number] => item !== null)
    : [];
}

function serializeAvailability(value: unknown): MatchmakingCandidate['availability'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return [];
    }

    const rawItem = item as RawRecord;
    const day = typeof rawItem.day === 'string' ? rawItem.day : '';
    const timeSlots = Array.isArray(rawItem.timeSlots)
      ? rawItem.timeSlots.flatMap((slot) => {
        if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) {
          return [];
        }

        const rawSlot = slot as RawRecord;

        if (typeof rawSlot.start !== 'string' || typeof rawSlot.end !== 'string') {
          return [];
        }

        return [{ start: rawSlot.start, end: rawSlot.end }];
      })
      : [];

    if (!day || timeSlots.length === 0) {
      return [];
    }

    return [{ day: day as MatchmakingCandidate['availability'][number]['day'], timeSlots }];
  });
}

function serializeRole(value: unknown): MatchmakingRoleRequirement | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const item = value as RawRecord;
  const roleId = String(item.roleId ?? '');
  const name = typeof item.name === 'string' && item.name ? item.name : roleId;

  if (!roleId && !name) {
    return null;
  }

  return {
    roleId,
    name,
    requiredSkills: serializeStringArray(item.requiredSkills)
  };
}

function serializeTeamMember(value: unknown): MatchmakingTeamMember | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const item = value as RawRecord;
  const userId = typeof item.userId === 'string' ? item.userId : '';

  if (!userId) {
    return null;
  }

  return {
    userId,
    experience: serializeExperience(item.experience)
  };
}

function serializeCandidate(value: unknown): MatchmakingCandidate | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const item = value as RawRecord;
  const userId = typeof item.userId === 'string' ? item.userId : '';

  if (!userId) {
    return null;
  }

  return {
    userId,
    user: typeof item.user === 'string' ? item.user : '',
    experience: serializeExperience(item.experience),
    availability: serializeAvailability(item.availability),
    reputationScore: Number(item.reputationScore ?? 0)
  };
}

export class MatchmakingRepository {
  public async findProjectContext(projectId: string): Promise<MatchmakingProjectContext | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto {projectId: $projectId})
         CALL {
           WITH project
           OPTIONAL MATCH (project)-[:TIENE_ROL]->(role:Rol)
           OPTIONAL MATCH (role)-[:REQUIERE]->(skill:Habilidad)
           WITH role, [skillName IN collect(DISTINCT skill.name) WHERE skillName IS NOT NULL] AS requiredSkills
           ORDER BY toLower(coalesce(role.name, '')), role.roleId
           RETURN [item IN collect(
             CASE
               WHEN role IS NULL THEN null
               ELSE {
                 roleId: coalesce(role.roleId, elementId(role)),
                 name: coalesce(role.name, role.nombre, ''),
                 requiredSkills: requiredSkills
               }
             END
           ) WHERE item IS NOT NULL] AS roles
         }
         CALL {
           WITH project
           OPTIONAL MATCH (member:Usuario)-[:PERTENECE_A]->(project)
           CALL {
             WITH member
             OPTIONAL MATCH (member)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill:Habilidad)
             WITH skill, experienceRel
             ORDER BY toLower(coalesce(skill.name, ''))
             RETURN [item IN collect(
               CASE
                 WHEN member IS NULL OR skill IS NULL THEN null
                 ELSE {
                   skillName: skill.name,
                   category: coalesce(skill.category, 'other'),
                   yearsOfExperience: coalesce(experienceRel.yearsOfExperience, 0.0),
                   level: experienceRel.level
                 }
               END
             ) WHERE item IS NOT NULL] AS experience
           }
           WITH member, experience
           ORDER BY member.userId
           RETURN [item IN collect(
             CASE
               WHEN member IS NULL THEN null
               ELSE {
                 userId: member.userId,
                 experience: experience
               }
             END
           ) WHERE item IS NOT NULL] AS teamMembers
         }
         CALL {
           WITH project
           MATCH (candidate:Usuario)
           WHERE NOT (candidate)-[:PERTENECE_A]->(project)
           CALL {
             WITH candidate
             OPTIONAL MATCH (candidate)-[experienceRel:TIENE_EXPERIENCIA_EN]->(skill:Habilidad)
             WITH skill, experienceRel
             ORDER BY toLower(coalesce(skill.name, ''))
             RETURN [item IN collect(
               CASE
                 WHEN skill IS NULL THEN null
                 ELSE {
                   skillName: skill.name,
                   category: coalesce(skill.category, 'other'),
                   yearsOfExperience: coalesce(experienceRel.yearsOfExperience, 0.0),
                   level: experienceRel.level
                 }
               END
             ) WHERE item IS NOT NULL] AS experience
           }
           CALL {
             WITH candidate
             OPTIONAL MATCH (candidate)-[:DISPONIBLE_EN]->(availability:Disponibilidad)
             WITH availability
             ORDER BY availability.start
             WITH [item IN collect(
               CASE
                 WHEN availability IS NULL THEN null
                 ELSE {
                   day: availability.day,
                   start: availability.start,
                   end: availability.end
                 }
               END
             ) WHERE item IS NOT NULL] AS availabilitySlots
             RETURN [day IN $weekdays
               WHERE size([slot IN availabilitySlots WHERE slot.day = day]) > 0 |
               {
                 day: day,
                 timeSlots: [slot IN availabilitySlots WHERE slot.day = day | {start: slot.start, end: slot.end}]
               }] AS availability
           }
           CALL {
             WITH candidate
             OPTIONAL MATCH (:Usuario)-[evaluation:EVALUO]->(candidate)
             WITH [rawScore IN collect(evaluation.puntaje) WHERE rawScore IS NOT NULL | coalesce(toFloat(rawScore), 0.0)] AS scores
             WITH [score IN scores |
               CASE
                 WHEN score < $minEvaluationScore THEN $minEvaluationScore
                 WHEN score > $maxEvaluationScore THEN $maxEvaluationScore
                 ELSE score
               END
             ] AS boundedScores
             RETURN CASE
               WHEN size(boundedScores) = 0 THEN 0.0
               ELSE (reduce(total = 0.0, score IN boundedScores | total + score) / size(boundedScores)) / $maxEvaluationScore
             END AS reputationScore
           }
           WITH candidate, experience, availability, reputationScore
           ORDER BY toLower(coalesce(candidate.user, '')), candidate.userId
           RETURN collect({
             userId: candidate.userId,
             user: candidate.user,
             experience: experience,
             availability: availability,
             reputationScore: reputationScore
           }) AS candidates
         }
         RETURN project.projectId AS projectId,
                coalesce(project.title, project.titulo, project.name, project.nombre, '') AS title,
                roles,
                teamMembers,
                candidates
         LIMIT 1`,
        {
          projectId,
          weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          minEvaluationScore: 0,
          maxEvaluationScore: 5
        }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];

      return {
        projectId: String(record.get('projectId')),
        title: typeof record.get('title') === 'string' ? record.get('title') as string : '',
        roles: Array.isArray(record.get('roles'))
          ? (record.get('roles') as unknown[]).map(serializeRole).filter((role): role is MatchmakingRoleRequirement => role !== null)
          : [],
        teamMembers: Array.isArray(record.get('teamMembers'))
          ? (record.get('teamMembers') as unknown[]).map(serializeTeamMember).filter((member): member is MatchmakingTeamMember => member !== null)
          : [],
        candidates: Array.isArray(record.get('candidates'))
          ? (record.get('candidates') as unknown[]).map(serializeCandidate).filter((candidate): candidate is MatchmakingCandidate => candidate !== null)
          : []
      };
    } finally {
      await session.close();
    }
  }
}
