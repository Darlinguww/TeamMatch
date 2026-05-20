import { driver } from '../../../database/neo4j.js';
import { NotFoundError } from '../../../shared/errors/HttpErrors.js';
import {
  CreateProjectInput,
  ProjectDetails,
  ProjectMatchSkillContribution,
  ProjectMatchWeights,
  ProjectPhaseOneCandidate,
  ProjectPhaseTwoCandidate,
  ProjectKanbanState,
  ProjectRoleInput,
  SemanticIndexRebuildResult,
  ProjectSummary,
  UpdateProjectKanbanInput
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
      const result = await session.run(
        `MATCH (leader:Usuario {userId: $leaderId})
         CREATE (project:Proyecto {
           projectId: $projectId,
           title: $title,
           description: $description,
           summary: $summary,
           status: 'open',
           kanbanSprintActive: false,
           kanbanCurrentSprint: 1,
           createdAt: $createdAt
         })
         MERGE (leader)-[membership:PERTENECE_A]->(project)
         SET membership.rol = 'lider',
             membership.role = 'lider',
             membership.isLeader = true,
             membership.createdAt = coalesce(membership.createdAt, $createdAt)
         WITH project, leader
         UNWIND $roles AS roleInput
         CREATE (role:Rol {
           roleId: randomUUID(),
           name: roleInput.role,
           headcount: coalesce(roleInput.headcount, 1)
         })
         MERGE (project)-[:TIENE_ROL]->(role)
         WITH project, leader, role, roleInput
         UNWIND roleInput.skills AS skillName
         MERGE (skill:Habilidad {normalizedName: toLower(trim(skillName))})
         ON CREATE SET skill.name = trim(skillName),
                       skill.createdAt = datetime(),
                       skill.es_tecnica = true
         ON MATCH SET skill.name = coalesce(skill.name, trim(skillName)),
                      skill.updatedAt = datetime()
         MERGE (role)-[:REQUIERE]->(skill)
         WITH project, leader
         RETURN leader.userId AS leaderId, project.projectId AS projectId`,
        {
          leaderId,
          projectId,
          title: input.title,
          description: input.description,
          summary,
          createdAt,
          roles: input.roles.map((r) => ({
            role: r.role,
            skills: r.skills,
            headcount: Math.max(1, Math.min(20, r.headcount ?? 1)),
          })),
        }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(
          'No se pudo crear el proyecto: el usuario líder no existe en la base de datos. Cierra sesión y vuelve a registrarte.'
        );
      }
    } finally {
      await session.close();
    }
  }

  public async listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto)
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A]-(leader:Usuario)
         WHERE coalesce(leaderRel.rol, leaderRel.role) = 'lider'
            OR coalesce(leaderRel.isLeader, false) = true
            OR toLower(coalesce(leaderRel.role, leaderRel.rol, '')) IN ['leader', 'lider', 'líder']
         WITH p, head(collect(DISTINCT leader)) AS leader
         OPTIONAL MATCH (member:Usuario)-[:PERTENECE_A]->(p)
         WITH p, leader, count(DISTINCT member) AS memberCount
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, memberCount, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, memberCount, collect(DISTINCT {
           role: r.name,
           skills: skills,
           headcount: coalesce(r.headcount, 1)
         }) AS roles
         RETURN p.projectId AS projectId,
                p.title AS title,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                memberCount,
                roles
         ORDER BY p.createdAt DESC`,
        { userId }
      );

      return result.records.map((record) => this.mapProjectSummary(record));
    } finally {
      await session.close();
    }
  }

  public async listOpenProjects(userId: string): Promise<ProjectSummary[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (p:Proyecto)
         WHERE coalesce(p.status, 'open') = 'open'
           AND NOT EXISTS {
             MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p)
           }
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A]-(leader:Usuario)
         WHERE coalesce(leaderRel.rol, leaderRel.role) = 'lider'
            OR coalesce(leaderRel.isLeader, false) = true
            OR toLower(coalesce(leaderRel.role, leaderRel.rol, '')) IN ['leader', 'lider', 'líder']
         WITH p, head(collect(DISTINCT leader)) AS leader
         OPTIONAL MATCH (member:Usuario)-[:PERTENECE_A]->(p)
         WITH p, leader, count(DISTINCT member) AS memberCount
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, memberCount, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, memberCount, collect(DISTINCT {
           role: r.name,
           skills: skills,
           headcount: coalesce(r.headcount, 1)
         }) AS roles
         RETURN p.projectId AS projectId,
                p.title AS title,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                memberCount,
                roles
         ORDER BY p.createdAt DESC`,
        { userId }
      );

      return result.records.map((record) => this.mapProjectSummary(record));
    } finally {
      await session.close();
    }
  }

  public async findOpenProjectById(projectId: string): Promise<ProjectDetails | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND coalesce(p.status, 'open') = 'open'
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A]-(leader:Usuario)
         WHERE coalesce(leaderRel.rol, leaderRel.role) = 'lider'
            OR coalesce(leaderRel.isLeader, false) = true
         WITH p, leader
         ORDER BY leader.userId
         WITH p, head(collect(leader)) AS leader
         OPTIONAL MATCH (member:Usuario)-[:PERTENECE_A]->(p)
         WITH p, leader, count(DISTINCT member) AS memberCount
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, memberCount, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, memberCount, collect(DISTINCT {
           role: r.name,
           skills: skills,
           headcount: coalesce(r.headcount, 1)
         }) AS roles
         RETURN coalesce(p.projectId, p.proyectoId) AS projectId,
                p.title AS title,
                p.description AS description,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                coalesce(p.kanbanSprintActive, false) AS kanbanSprintActive,
                coalesce(p.kanbanCurrentSprint, 1) AS kanbanCurrentSprint,
                memberCount,
                roles
         LIMIT 1`,
        { projectId }
      );

      if (!result.records[0]) {
        return null;
      }

      return this.mapProjectDetails(result.records[0]);
    } finally {
      await session.close();
    }
  }

  public async addMemberToOpenProject(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();
    const joinedAt = new Date().toISOString();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND coalesce(project.status, 'open') = 'open'
         MATCH (user:Usuario {userId: $userId})
         MERGE (user)-[membership:PERTENECE_A]->(project)
         ON CREATE SET membership.rol = 'miembro',
                       membership.role = 'miembro',
                       membership.isLeader = false,
                       membership.createdAt = $joinedAt
         ON MATCH SET membership.rol = coalesce(membership.rol, 'miembro'),
                      membership.role = coalesce(membership.role, 'miembro')
         RETURN coalesce(project.projectId, project.proyectoId) AS projectId
         LIMIT 1`,
        { userId, projectId, joinedAt }
      );

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async updateProject(
    userId: string,
    projectId: string,
    input: { title: string; description: string; roles?: ProjectRoleInput[] }
  ): Promise<ProjectDetails> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    const summary = input.description.slice(0, 160) + (input.description.length > 160 ? '...' : '');

    try {
      const updateResult = await session.run(
        `MATCH (project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         SET project.title = $title,
             project.nombre = $title,
             project.description = $description,
             project.descripcion = $description,
             project.summary = $summary,
             project.updatedAt = $updatedAt
         RETURN coalesce(project.projectId, project.proyectoId) AS projectKey`,
        {
          projectId,
          title: input.title,
          description: input.description,
          summary,
          updatedAt,
        }
      );

      if (!updateResult.records[0]) {
        throw new NotFoundError('Project not found');
      }

      if (input.roles && input.roles.length > 0) {
        await session.run(
          `MATCH (project:Proyecto)
           WHERE project.projectId = $projectId OR project.proyectoId = $projectId
           OPTIONAL MATCH (project)-[oldRoleRel:TIENE_ROL]->(oldRole:Rol)
           DETACH DELETE oldRole
           WITH project
           UNWIND $roles AS roleInput
           CREATE (role:Rol {
             roleId: randomUUID(),
             name: roleInput.role,
             headcount: coalesce(roleInput.headcount, 1)
           })
           MERGE (project)-[:TIENE_ROL]->(role)
           WITH role, roleInput
           UNWIND roleInput.skills AS skillName
           MERGE (skill:Habilidad {normalizedName: toLower(trim(skillName))})
           ON CREATE SET skill.name = trim(skillName),
                         skill.createdAt = datetime(),
                         skill.es_tecnica = true
           ON MATCH SET skill.name = coalesce(skill.name, trim(skillName)),
                        skill.updatedAt = datetime()
           MERGE (role)-[:REQUIERE]->(skill)`,
          {
            projectId,
            roles: input.roles.map((r) => ({
              role: r.role,
              skills: r.skills,
              headcount: Math.max(1, Math.min(20, r.headcount ?? 1)),
            })),
          }
        );
      }

      const result = await this.findProjectForUser(userId, projectId);
      if (!result) {
        throw new NotFoundError('Project not found after update');
      }

      return result;
    } finally {
      await session.close();
    }
  }

  public async findProjectForUser(userId: string, projectId: string): Promise<ProjectDetails | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         OPTIONAL MATCH (p)<-[leaderRel:PERTENECE_A]-(leader:Usuario)
         WHERE coalesce(leaderRel.rol, leaderRel.role) = 'lider'
            OR coalesce(leaderRel.isLeader, false) = true
         WITH p, leader
         ORDER BY leader.userId
         WITH p, head(collect(leader)) AS leader
         OPTIONAL MATCH (member:Usuario)-[:PERTENECE_A]->(p)
         WITH p, leader, count(DISTINCT member) AS memberCount
         OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
         OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
         WITH p, leader, memberCount, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
         WITH p, leader, memberCount, collect(DISTINCT {
           role: r.name,
           skills: skills,
           headcount: coalesce(r.headcount, 1)
         }) AS roles
         RETURN coalesce(p.projectId, p.proyectoId) AS projectId,
                p.title AS title,
                p.description AS description,
                p.summary AS summary,
                p.createdAt AS createdAt,
                leader.userId AS leaderId,
                leader.email AS leaderEmail,
                coalesce(p.kanbanSprintActive, false) AS kanbanSprintActive,
                coalesce(p.kanbanCurrentSprint, 1) AS kanbanCurrentSprint,
                memberCount,
                roles
         LIMIT 1`,
        { userId, projectId }
      );

      if (!result.records[0]) {
        return null;
      }

      return this.mapProjectDetails(result.records[0]);
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

  public async findProjectLeader(projectId: string): Promise<string | null> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (leader:Usuario)-[rel:PERTENECE_A]->(p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND (
             coalesce(rel.rol, rel.role) = 'lider'
             OR coalesce(rel.isLeader, false) = true
             OR toLower(coalesce(rel.role, rel.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN leader.userId AS leaderId
         LIMIT 1`,
        { projectId }
      );

      if (!result.records[0]) return null;
      return String(result.records[0].get('leaderId'));
    } finally {
      await session.close();
    }
  }

  public async setProjectStatusAndFeedback(projectId: string, status: string, feedbackEnabled: boolean, feedbackStart: string | null, feedbackEnd: string | null): Promise<void> {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (p:Proyecto {projectId: $projectId})
         SET p.status = $status,
             p.feedbackEnabled = $feedbackEnabled,
             p.feedbackStart = $feedbackStart,
             p.feedbackEnd = $feedbackEnd,
             p.updatedAt = $updatedAt`,
        {
          projectId,
          status,
          feedbackEnabled,
          feedbackStart,
          feedbackEnd,
          updatedAt: new Date().toISOString()
        }
      );
    } finally {
      await session.close();
    }
  }

  public async isUserMemberOfProject(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[rel:PERTENECE_A]->(p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         RETURN count(rel) AS c`,
        { userId, projectId }
      );
      const count = result.records[0]?.get('c');
      return Number(count ?? 0) > 0;
    } finally {
      await session.close();
    }
  }

  public async hasFeedbackBetweenUsers(projectId: string, fromUserId: string, toUserId: string): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (from:Usuario {userId: $fromUserId})-[f:EVALUO]->(to:Usuario {userId: $toUserId})
         WHERE coalesce(f.proyectoId, f.projectId) = $projectId
         RETURN count(f) AS c`,
        { projectId, fromUserId, toUserId }
      );
      const count = result.records[0]?.get('c');
      return Number(count ?? 0) > 0;
    } finally {
      await session.close();
    }
  }

  public async createFeedbackRelationship(projectId: string, fromUserId: string, toUserId: string, score: number, comment: string | null, createdAt: string): Promise<void> {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (from:Usuario {userId: $fromUserId}), (to:Usuario {userId: $toUserId}), (p:Proyecto {projectId: $projectId})
         MERGE (from)-[f:EVALUO]->(to)
         ON CREATE SET f.proyectoId = $projectId,
                       f.projectId = $projectId,
                       f.evaluadorId = $fromUserId,
                       f.evaluadoId = $toUserId
         SET f.puntaje = $score,
             f.score = $score,
             f.comment = $comment,
             f.createdAt = $createdAt`,
        { projectId, fromUserId, toUserId, score, comment, createdAt }
      );
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

  public async updateProjectKanban(
    userId: string,
    projectId: string,
    input: UpdateProjectKanbanInput
  ): Promise<ProjectKanbanState> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[m:PERTENECE_A]->(p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND (coalesce(m.isLeader, false) = true OR coalesce(m.rol, m.role) = 'lider')
         SET p.kanbanSprintActive = $sprintActive,
             p.kanbanCurrentSprint = $currentSprint,
             p.updatedAt = $updatedAt
         RETURN coalesce(p.kanbanSprintActive, false) AS kanbanSprintActive,
                coalesce(p.kanbanCurrentSprint, 1) AS kanbanCurrentSprint`,
        {
          userId,
          projectId,
          sprintActive: input.sprintActive,
          currentSprint: input.currentSprint,
          updatedAt: new Date().toISOString()
        }
      );

      if (!result.records[0]) {
        throw new NotFoundError('Project not found or user is not the leader');
      }

      return this.mapKanbanState(result.records[0]);
    } finally {
      await session.close();
    }
  }

  private mapKanbanState(record: { get(key: string): unknown }): ProjectKanbanState {
    return {
      sprintActive: record.get('kanbanSprintActive') === true,
      currentSprint: this.toNumber(record.get('kanbanCurrentSprint')) || 1
    };
  }

  private mapProjectDetails(record: { get(key: string): unknown }): ProjectDetails {
    return {
      ...this.mapProjectSummary(record),
      description: String(record.get('description') ?? ''),
      kanban: this.mapKanbanState(record)
    };
  }

  private mapProjectSummary(record: { get(key: string): unknown }): ProjectSummary {
    const memberCount = Number(record.get('memberCount') ?? 0);
    return {
      id: String(record.get('projectId')),
      title: String(record.get('title')),
      summary: String(record.get('summary') ?? ''),
      createdAt: String(record.get('createdAt')),
      leader: {
        userId: record.get('leaderId') ? String(record.get('leaderId')) : null,
        email: record.get('leaderEmail') ? String(record.get('leaderEmail')) : null
      },
      roles: this.mapRoles(record.get('roles')),
      memberCount: Number.isFinite(memberCount) && memberCount > 0 ? memberCount : 1
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
