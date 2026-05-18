import { driver } from '../../../database/neo4j.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectPhaseOneCandidate,
  ProjectRoleInput,
  ProjectSummary
} from '../types/project.types.js';
import { ProjectRepository as ProjectRepositoryContract } from '../project.service.js';

export class Neo4jProjectRepository implements ProjectRepositoryContract {
  public async findMissingSkillNames(skillNames: string[]): Promise<string[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        'MATCH (s:Habilidad) WHERE s.name IN $names RETURN collect(s.name) AS names',
        { names: skillNames }
      );
      const found = new Set((result.records[0]?.get('names') as string[] | undefined) ?? []);
      return skillNames.filter((name) => !found.has(name));
    } finally {
      await session.close();
    }
  }

  public async createProject(leaderId: string, projectId: string, input: CreateProjectInput): Promise<void> {
    const session = driver.session();
    const createdAt = new Date().toISOString();
    const summary = input.description.slice(0, 160) + (input.description.length > 160 ? '...' : '');

    try {
      await session.run(
        `MATCH (leader:Usuario {userId: $leaderId})
         CREATE (project:Proyecto {
           projectId: $projectId,
           title: $title,
           description: $description,
           summary: $summary,
           createdAt: $createdAt
         })
         MERGE (leader)-[membership:PERTENECE_A]->(project)
         SET membership.rol = 'lider'
         WITH project
         UNWIND $roles AS roleInput
         CREATE (role:Rol { roleId: randomUUID(), name: roleInput.role })
         MERGE (project)-[:TIENE_ROL]->(role)
         WITH role, roleInput
         UNWIND roleInput.skills AS skillName
         MATCH (skill:Habilidad { name: skillName })
         MERGE (role)-[:REQUIERE]->(skill)`,
        {
          leaderId,
          projectId,
          title: input.title,
          description: input.description,
          summary,
          createdAt,
          roles: input.roles
        }
      );
    } finally {
      await session.close();
    }
  }

  public async listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto)
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A {rol: 'lider'}]-(leader:Usuario)
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, collect(DISTINCT { role: r.name, skills: skills }) AS roles
         RETURN p.projectId AS projectId,
                p.title AS title,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                roles
         ORDER BY p.createdAt DESC`,
        { userId }
      );

      return result.records.map((record) => this.mapProjectSummary(record));
    } finally {
      await session.close();
    }
  }

  public async findProjectForUser(userId: string, projectId: string): Promise<ProjectDetails | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A {rol: 'lider'}]-(leader:Usuario)
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, collect(DISTINCT { role: r.name, skills: skills }) AS roles
         RETURN p.projectId AS projectId,
                p.title AS title,
                p.description AS description,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                roles
         LIMIT 1`,
        { userId, projectId }
      );

      if (!result.records[0]) {
        return null;
      }

      return {
        ...this.mapProjectSummary(result.records[0]),
        description: String(result.records[0].get('description') ?? '')
      };
    } finally {
      await session.close();
    }
  }

  public async findPhaseOneCandidates(userId: string, projectId: string): Promise<ProjectPhaseOneCandidate[] | null> {
    const session = driver.session();

    try {
      const metaResult = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
         OPTIONAL MATCH (leader:Usuario)-[:PERTENECE_A {rol: 'lider'}]->(p)
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(requiredSkill:Habilidad)
         WITH p, leader, collect(DISTINCT coalesce(requiredSkill.normalizedName, toLower(requiredSkill.name))) AS requiredSkillNames
         RETURN p.projectId AS projectId,
                leader.userId AS leaderId,
                [name IN requiredSkillNames WHERE name IS NOT NULL] AS requiredSkillNames
         LIMIT 1`,
        { userId, projectId }
      );

      if (!metaResult.records[0]) {
        return null;
      }

      const requiredSkillNames = metaResult.records[0].get('requiredSkillNames') as string[];
      if (requiredSkillNames.length === 0) {
        return [];
      }

      const result = await session.run(
        `MATCH (candidate:Usuario)-[:TIENE_HABILIDAD]->(skill:Habilidad)
         WHERE coalesce(skill.normalizedName, toLower(skill.name)) IN $requiredSkillNames
           AND ($leaderId IS NULL OR candidate.userId <> $leaderId)
         WITH candidate, collect(DISTINCT skill.name) AS matchedSkills
         RETURN candidate.userId AS userId,
                matchedSkills
         ORDER BY size(matchedSkills) DESC, toLower(candidate.user), candidate.userId`,
        {
          requiredSkillNames,
          leaderId: metaResult.records[0].get('leaderId') as string | null
        }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        matchedSkills: record.get('matchedSkills') as string[]
      }));
    } finally {
      await session.close();
    }
  }

  private mapProjectSummary(record: { get(key: string): unknown }): ProjectSummary {
    return {
      id: String(record.get('projectId')),
      title: String(record.get('title')),
      summary: String(record.get('summary') ?? ''),
      createdAt: String(record.get('createdAt')),
      leader: {
        userId: record.get('leaderId') ? String(record.get('leaderId')) : null,
        email: record.get('leaderEmail') ? String(record.get('leaderEmail')) : null
      },
      roles: this.mapRoles(record.get('roles'))
    };
  }

  private mapRoles(value: unknown): ProjectRoleInput[] {
    return Array.isArray(value)
      ? value.filter((role): role is ProjectRoleInput => Boolean(role && typeof role === 'object' && 'role' in role))
      : [];
  }
}
