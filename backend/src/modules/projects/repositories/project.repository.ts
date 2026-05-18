import { driver } from '../../../database/neo4j.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectMatchSkillContribution,
  ProjectMatchWeights,
  ProjectPhaseOneCandidate,
  ProjectPhaseTwoCandidate,
  ProjectRoleInput,
  SemanticIndexRebuildResult,
  ProjectSummary
} from '../types/project.types.js';
import { ProjectRepository as ProjectRepositoryContract } from '../project.service.js';

const DEFAULT_SKILL_LEVEL = 1;
const MAX_SKILL_LEVEL = 5;
const GDS_SKILLS_GRAPH = 'teamMatchSkillsSimilarity';

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

  public async findPhaseTwoCandidates(
    userId: string,
    projectId: string,
    weights: ProjectMatchWeights
  ): Promise<ProjectPhaseTwoCandidate[] | null> {
    const session = driver.session();

    try {
      const accessResult = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(project:Proyecto {projectId: $projectId})
         OPTIONAL MATCH (project)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(requiredSkill:Habilidad)
         WITH project, collect(DISTINCT requiredSkill) AS requiredSkills
         RETURN project.projectId AS projectId,
                [skill IN requiredSkills WHERE skill IS NOT NULL] AS requiredSkills
         LIMIT 1`,
        { userId, projectId }
      );

      if (!accessResult.records[0]) {
        return null;
      }

      const requiredSkills = accessResult.records[0].get('requiredSkills') as unknown[];
      if (requiredSkills.length === 0) {
        return [];
      }

      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(project:Proyecto {projectId: $projectId})
         OPTIONAL MATCH (leader:Usuario)-[:PERTENECE_A {rol: 'lider'}]->(project)
         MATCH (project)-[:TIENE_ROL]->(:Rol)-[:REQUIERE]->(required:Habilidad)
         CALL {
           WITH required
           MATCH (candidate:Usuario)-[hasSkill:TIENE_HABILIDAD]->(matched:Habilidad)
           WHERE coalesce(matched.normalizedName, toLower(matched.name)) = coalesce(required.normalizedName, toLower(required.name))
           RETURN candidate,
                  required.name AS requiredSkill,
                  matched.name AS matchedSkill,
                  'exact' AS matchType,
                  $exactWeight AS weight,
                  1.0 AS semanticScore,
                  coalesce(toFloat(hasSkill.nivel), toFloat(hasSkill.level), $defaultSkillLevel) AS rawLevel

           UNION

           WITH required
           MATCH (required)-[similarity:SIMILAR_A]-(matched:Habilidad)<-[hasSkill:TIENE_HABILIDAD]-(candidate:Usuario)
           WHERE coalesce(matched.normalizedName, toLower(matched.name)) <> coalesce(required.normalizedName, toLower(required.name))
           RETURN candidate,
                  required.name AS requiredSkill,
                  matched.name AS matchedSkill,
                  'similar' AS matchType,
                  $similarWeight AS weight,
                  coalesce(toFloat(similarity.score), 1.0) AS semanticScore,
                  coalesce(toFloat(hasSkill.nivel), toFloat(hasSkill.level), $defaultSkillLevel) AS rawLevel

           UNION

           WITH required
           MATCH (required)-[complement:COMPLEMENTA]-(matched:Habilidad)<-[hasSkill:TIENE_HABILIDAD]-(candidate:Usuario)
           WHERE coalesce(matched.normalizedName, toLower(matched.name)) <> coalesce(required.normalizedName, toLower(required.name))
           RETURN candidate,
                  required.name AS requiredSkill,
                  matched.name AS matchedSkill,
                  'complementary' AS matchType,
                  $complementaryWeight AS weight,
                  coalesce(toFloat(complement.score), 1.0) AS semanticScore,
                  coalesce(toFloat(hasSkill.nivel), toFloat(hasSkill.level), $defaultSkillLevel) AS rawLevel
         }
         WHERE leader IS NULL OR candidate.userId <> leader.userId
         WITH candidate,
              requiredSkill,
              matchedSkill,
              matchType,
              CASE
                WHEN semanticScore < 0 THEN 0.0
                WHEN semanticScore > 1 THEN 1.0
                ELSE semanticScore
              END AS semanticScore,
              CASE
                WHEN rawLevel < 1 THEN 1.0
                WHEN rawLevel > $maxSkillLevel THEN $maxSkillLevel
                ELSE rawLevel
              END AS level,
              weight
         WITH candidate,
              requiredSkill,
              matchedSkill,
              matchType,
              semanticScore,
              level,
              weight * semanticScore * (1.0 + ((level - 1.0) * 0.1)) AS contributionScore
         WITH candidate,
              collect({
                requiredSkill: requiredSkill,
                matchedSkill: matchedSkill,
                matchType: matchType,
                semanticScore: semanticScore,
                level: level,
                score: contributionScore
              }) AS skills,
              sum(contributionScore) AS totalScore
         RETURN candidate.userId AS userId,
                candidate.email AS email,
                candidate.user AS name,
                round(totalScore * 1000.0) / 1000.0 AS score,
                size([skill IN skills WHERE skill.matchType = 'exact']) AS exactMatches,
                size([skill IN skills WHERE skill.matchType = 'similar']) AS similarMatches,
                size([skill IN skills WHERE skill.matchType = 'complementary']) AS complementaryMatches,
                skills
         ORDER BY score DESC, exactMatches DESC, similarMatches DESC, toLower(candidate.user), candidate.userId`,
        {
          userId,
          projectId,
          exactWeight: weights.exact,
          similarWeight: weights.similar,
          complementaryWeight: weights.complementary,
          defaultSkillLevel: DEFAULT_SKILL_LEVEL,
          maxSkillLevel: MAX_SKILL_LEVEL
        }
      );

      return result.records.map((record) => ({
        userId: String(record.get('userId')),
        email: record.get('email') ? String(record.get('email')) : null,
        name: record.get('name') ? String(record.get('name')) : null,
        score: this.toNumber(record.get('score')),
        exactMatches: this.toNumber(record.get('exactMatches')),
        similarMatches: this.toNumber(record.get('similarMatches')),
        complementaryMatches: this.toNumber(record.get('complementaryMatches')),
        skills: this.mapSkillContributions(record.get('skills'))
      }));
    } finally {
      await session.close();
    }
  }

  public async rebuildSemanticIndex(input: {
    similarityCutoff: number;
    topK: number;
  }): Promise<SemanticIndexRebuildResult> {
    const session = driver.session();

    try {
      await session.run('CALL gds.version() YIELD version RETURN version');

      const graphExistsResult = await session.run(
        'CALL gds.graph.exists($graphName) YIELD exists RETURN exists',
        { graphName: GDS_SKILLS_GRAPH }
      );

      if (Boolean(graphExistsResult.records[0]?.get('exists'))) {
        await session.run('CALL gds.graph.drop($graphName) YIELD graphName RETURN graphName', {
          graphName: GDS_SKILLS_GRAPH
        });
      }

      const projectionResult = await session.run(
        `CALL gds.graph.project(
           $graphName,
           ['Habilidad', 'Usuario', 'Rol'],
           {
             TIENE_HABILIDAD: {orientation: 'UNDIRECTED'},
             REQUIERE: {orientation: 'UNDIRECTED'}
           }
         )
         YIELD graphName, nodeCount, relationshipCount
         RETURN graphName, nodeCount, relationshipCount`,
        { graphName: GDS_SKILLS_GRAPH }
      );

      await session.run('MATCH (:Habilidad)-[relation:SIMILAR_A]->(:Habilidad) DELETE relation');

      const similarityResult = await session.run(
        `CALL gds.nodeSimilarity.stream($graphName, {
           topK: $topK,
           similarityCutoff: $similarityCutoff
         })
         YIELD node1, node2, similarity
         WITH gds.util.asNode(node1) AS source,
              gds.util.asNode(node2) AS target,
              similarity
         WHERE source:Habilidad
           AND target:Habilidad
           AND coalesce(source.normalizedName, toLower(source.name)) <> coalesce(target.normalizedName, toLower(target.name))
         MERGE (source)-[relation:SIMILAR_A]->(target)
         SET relation.score = similarity,
             relation.source = 'gds.nodeSimilarity',
             relation.updatedAt = datetime()
         RETURN count(relation) AS relationshipsCreated`,
        {
          graphName: GDS_SKILLS_GRAPH,
          topK: input.topK,
          similarityCutoff: input.similarityCutoff
        }
      );

      const projection = projectionResult.records[0];
      return {
        graphName: String(projection.get('graphName')),
        nodeCount: this.toNumber(projection.get('nodeCount')),
        relationshipCount: this.toNumber(projection.get('relationshipCount')),
        relationshipsCreated: this.toNumber(similarityResult.records[0]?.get('relationshipsCreated')),
        similarityCutoff: input.similarityCutoff,
        topK: input.topK
      };
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

  private mapSkillContributions(value: unknown): ProjectMatchSkillContribution[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((skill) => {
      const item = skill as Record<string, unknown>;
      const rawMatchType = String(item.matchType);

      return {
        requiredSkill: String(item.requiredSkill),
        matchedSkill: String(item.matchedSkill),
        matchType: rawMatchType === 'similar' || rawMatchType === 'complementary' ? rawMatchType : 'exact',
        semanticScore: this.toNumber(item.semanticScore),
        level: this.toNumber(item.level),
        score: this.toNumber(item.score)
      };
    });
  }

  private toNumber(value: unknown): number {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}
