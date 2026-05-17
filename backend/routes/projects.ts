import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { driver } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { title, description, roles } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Título es requerido' });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Debe definir al menos un rol' });
  }

  const normalizedRoles = roles.map((item: any, index: number) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Rol inválido en la posición ${index}`);
    }
    const roleName = typeof item.role === 'string' ? item.role.trim() : '';
    if (!roleName) {
      throw new Error(`El nombre del rol es requerido en la posición ${index}`);
    }
    if (!Array.isArray(item.skills) || item.skills.length === 0) {
      throw new Error(`El rol '${roleName}' debe incluir al menos una skill`);
    }
    const skills = item.skills
      .filter((skill: any) => typeof skill === 'string' && skill.trim())
      .map((skill: string) => skill.trim());
    if (skills.length === 0) {
      throw new Error(`El rol '${roleName}' debe incluir al menos una skill válida`);
    }
    return { role: roleName, skills };
  });

  const allSkills = Array.from(new Set(normalizedRoles.flatMap((r) => r.skills)));
  const session = driver.session();

  try {
    const skillsResult = await session.run(
      'MATCH (s:Habilidad) WHERE s.name IN $names RETURN s.name AS name',
      { names: allSkills }
    );
    const foundSkills = new Set(skillsResult.records.map((record) => record.get('name')));
    const missingSkills = allSkills.filter((name) => !foundSkills.has(name));
    if (missingSkills.length > 0) {
      return res.status(400).json({ error: `Las siguientes habilidades no existen: ${missingSkills.join(', ')}` });
    }

    const projectId = randomUUID();
    const createdAt = new Date().toISOString();
    const summary = description && typeof description === 'string'
      ? description.trim().slice(0, 160) + (description.trim().length > 160 ? '...' : '')
      : '';

    await session.run(
      `MATCH (leader:Usuario {userId: $leaderId})
       CREATE (project:Proyecto {
         projectId: $projectId,
         title: $title,
         description: $description,
         summary: $summary,
         createdAt: $createdAt
       })
       MERGE (leader)-[:PERTENECE_A]->(project)
       WITH project
       UNWIND $roles AS roleInput
       CREATE (role:Rol { roleId: randomUUID(), name: roleInput.role })
       MERGE (project)-[:TIENE_ROL]->(role)
       WITH role, roleInput
       UNWIND roleInput.skills AS skillName
       MATCH (skill:Habilidad { name: skillName })
       MERGE (role)-[:REQUIERE]->(skill)
       RETURN project.projectId AS projectId`,
      {
        leaderId: req.user!.userId,
        projectId,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        summary,
        createdAt,
        roles: normalizedRoles
      }
    );

    return res.status(201).json({ projectId });
  } catch (error: any) {
    if (error.message?.startsWith('Rol inválido') || error.message?.startsWith('El nombre del rol') || error.message?.startsWith('El rol')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('POST /projects', error);
    return res.status(500).json({ error: 'Error al crear el proyecto' });
  } finally {
    await session.close();
  }
});

router.get('/', async (_req: Request, res: Response) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:Proyecto)<-[:PERTENECE_A]-(leader:Usuario)
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
       ORDER BY p.createdAt DESC`
    );

    const projects = result.records.map((record) => {
      const rawRoles = record.get('roles') as Array<{ role: string; skills: string[] }>;
      const roles = Array.isArray(rawRoles)
        ? rawRoles.filter((role) => role.role != null)
        : [];
      return {
        id: record.get('projectId'),
        title: record.get('title'),
        summary: record.get('summary') || '',
        createdAt: record.get('createdAt'),
        leader: {
          userId: record.get('leaderId'),
          email: record.get('leaderEmail')
        },
        roles
      };
    });

    return res.json({ projects });
  } catch (error) {
    console.error('GET /projects', error);
    return res.status(500).json({ error: 'Error al obtener los proyectos' });
  } finally {
    await session.close();
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:Proyecto {projectId: $projectId})<-[:PERTENECE_A]-(leader:Usuario)
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
              roles`,
      { projectId: id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const record = result.records[0];
    const rawRoles = record.get('roles') as Array<{ role: string; skills: string[] }>;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.filter((role) => role.role != null)
      : [];

    return res.json({
      id: record.get('projectId'),
      title: record.get('title'),
      description: record.get('description') || '',
      summary: record.get('summary') || '',
      createdAt: record.get('createdAt'),
      leader: {
        userId: record.get('leaderId'),
        email: record.get('leaderEmail')
      },
      roles
    });
  } finally {
    await session.close();
  }
});

export default router;
