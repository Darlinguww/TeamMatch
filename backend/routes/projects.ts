import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { driver } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { isUserInProjectByTask, isUserInProject } from './tasks';

const router = Router();

// Crear un nuevo proyecto
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
       MERGE (leader)-[membership:PERTENECE_A]->(project)
       SET membership.rol = 'lider'
       WITH project
       UNWIND $skills AS skillName
       MATCH (skill:Habilidad { name: skillName })
       MERGE (project)-[:REQUIERE]->(skill)
       RETURN project.projectId AS projectId`,
      {
        leaderId: req.user!.userId,
        projectId,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        summary,
        createdAt,
        skills: allSkills
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


// Obtener todos los proyectos del usuario autenticado
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (u:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto)
       OPTIONAL MATCH (leader:Usuario)-[:PERTENECE_A {rol: 'lider'}]->(p)
       OPTIONAL MATCH (p)-[:REQUIERE]->(s:Habilidad)
       WITH p, leader, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
       RETURN p.projectId AS projectId,
              p.title AS title,
              p.summary AS summary,
              p.createdAt AS createdAt,
              leader.userId AS leaderId,
              leader.email AS leaderEmail,
              skills
       ORDER BY p.createdAt DESC`,
      { userId }
    );

    const projects = result.records.map((record) => {
      const skills = record.get('skills') as string[];
      return {
        id: record.get('projectId'),
        title: record.get('title'),
        summary: record.get('summary') || '',
        createdAt: record.get('createdAt'),
        leader: {
          userId: record.get('leaderId'),
          email: record.get('leaderEmail')
        },
        roles: skills.length > 0 ? [{ role: 'requerido', skills }] : []
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

// Obtener detalles de un proyecto específico
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (u:Usuario {userId: $userId})-[:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
       OPTIONAL MATCH (leader:Usuario)-[:PERTENECE_A {rol: 'lider'}]->(p)
       OPTIONAL MATCH (p)-[:REQUIERE]->(s:Habilidad)
       WITH p, leader, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
       RETURN p.projectId AS projectId,
              p.title AS title,
              p.description AS description,
              p.summary AS summary,
              p.createdAt AS createdAt,
              leader.userId AS leaderId,
              leader.email AS leaderEmail,
              skills`,
      { userId, projectId: id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const record = result.records[0];
    const skills = record.get('skills') as string[];

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
      roles: skills.length > 0 ? [{ role: 'requerido', skills }] : []
    });
  } finally {
    await session.close();
  }
});


// Crear una tarea dentro de un proyecto específico
router.post('/:projectId/tasks', requireAuth, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { title, description, userAsigned } = req.body ?? {};

  // Verificar que el usuario actual hace parte del proyecto
  const userId = req.user?.userId;
  if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }else {
      const hasAccess = await isUserInProject(userId, projectId);
      if (!hasAccess) {
          return res.status(403).json({ error: 'Forbidden' });
      }
  }

  // Validación básica del título
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'El título de la tarea es requerido' });
  }

  const session = driver.session();

  try {
    // Verificar que el proyecto existe
    const projectResult = await session.run(
      'MATCH (p:Proyecto {projectId: $projectId}) RETURN p.projectId AS projectId',
      { projectId }
    );
    if (projectResult.records.length === 0) {
      return res.status(404).json({ error: 'El proyecto no existe' });
    }

    // Crear la tarea
    const taskId = randomUUID();
    const createdAt = new Date().toISOString();
    const taskDescription = description && typeof description === 'string'
      ? description.trim()
      : '';

    let query = `MATCH (project:Proyecto {projectId: $projectId})
                 CREATE (task:Tarea {
                   taskId: $taskId,
                   title: $title,
                   description: $description,
                   createdAt: $createdAt,
                   status: 'pendiente'
                 })
                 MERGE (project)-[:CONTIENE]->(task)`;

    const params: any = {
      projectId,
      taskId,
      title: title.trim(),
      description: taskDescription,
      createdAt
    };

    // Si hay un usuario asignado, crear la relación
    if (userAsigned && typeof userAsigned === 'string') {
      query += ` WITH task
                 MATCH (user:Usuario {userId: $userId})
                 MERGE (user)-[:ASIGNADO_A]->(task)`;
      params.userId = userAsigned;
    }

    query += ` RETURN task.taskId AS taskId`;

    const result = await session.run(query, params);

    if (result.records.length === 0) {
      return res.status(500).json({ error: 'Error al crear la tarea' });
    }

    return res.status(201).json({
      taskId: result.records[0].get('taskId'),
      title: title.trim(),
      description: taskDescription,
      createdAt,
      status: 'pendiente',
      userAsigned: userAsigned || null
    });
  } catch (error: any) {
    console.error('POST /:projectId/tasks', error);
    return res.status(500).json({ error: 'Error al crear la tarea' });
  } finally {
    await session.close();
  }
});


// Obtener todas las tareas de un proyecto específico, con opción de filtrar por estado
router.get('/:projectId/tasks', requireAuth, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const statusFilter = req.query.status as string | undefined;
  const session = driver.session();

  // Verificar que el usuario actual hace parte del proyecto
  const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }else {
        const hasAccess = await isUserInProject(userId, projectId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }


  try {
    const projectResult = await session.run(
      'MATCH (p:Proyecto {projectId: $projectId}) RETURN p.projectId AS projectId',
      { projectId }
    );
    if (projectResult.records.length === 0) {
      return res.status(404).json({ error: 'El proyecto no existe' });
    }
    let query = `MATCH (project:Proyecto {projectId: $projectId})-[:CONTIENE]->(task:Tarea)
                 OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(user:Usuario)`;
    const params: any = { projectId };

    // Si se proporciona un filtro de estado, agregarlo a la consulta
    if (statusFilter && typeof statusFilter === 'string') {
      query += ' WHERE task.status = $status';
      params.status = statusFilter;
    }

    query += ` RETURN task.taskId AS taskId,
                        task.title AS title,
                        task.description AS description,
                        task.createdAt AS createdAt,
                        task.status AS status,
                        user.userId AS userId,
                        user.email AS userEmail
                 ORDER BY task.createdAt DESC`;

    const result = await session.run(query, params);

    return res.status(200).json(result.records.map((record) => {
      return {
        taskId: record.get('taskId'),
        title: record.get('title'),
        description: record.get('description'),
        createdAt: record.get('createdAt'),
        status: record.get('status'),
        userId: record.get('userId'),
        userEmail: record.get('userEmail')
      };
    }));
  } catch (error: any) {
    console.error('GET /:projectId/tasks', error);
    return res.status(500).json({ error: 'Error al obtener las tareas' });
  } finally {
    await session.close();
  }
});


// Evaluar tareas
router.post('/:taskId/reviews', requireAuth, async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { rating, comment } = req.body ?? {};
  const reviewerId = req.user?.userId;
  const session = driver.session();

  if (!reviewerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5' });
  }

  const hasAccess = await isUserInProjectByTask(reviewerId, taskId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const taskResult = await session.run(
      'MATCH (t:Tarea {taskId: $taskId}) RETURN t.taskId AS taskId',
      { taskId }
    );
    if (taskResult.records.length === 0) {
      return res.status(404).json({ error: 'La tarea no existe' });
    }
    const result = await session.run(
      `MATCH (u:Usuario {userId: $userId})
      MATCH (t:Tarea {taskId: $taskId})

      MERGE (u)-[r:EVALUÓ]->(t)

      SET r.puntaje = $score,
          r.feedback = $feedback,
          r.createdAt = datetime()

      RETURN {
        userId: u.userId,
        taskId: t.taskId,
        score: r.puntaje,
        feedback: r.feedback,
        createdAt: r.createdAt
      } AS review`,
      { taskId, userId: reviewerId, score: rating, feedback: comment || '' }
    );

    return res.status(201).json(result.records[0].get('review'));
  } catch (error: any) {
    console.error('POST /:taskId/reviews', error);
    return res.status(500).json({ error: 'Error al crear la reseña' });
  } finally {
    await session.close();
  }
});



// ------- Pipeline de matching de candidatos -------
// Fase 1 - Filtrado estructural: devolver candidatos que tienen al menos una de las habilidades del proyecto
router.get('/:id/match/phase1', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    // Obtener skills del proyecto y el líder (creator)
    const metaResult = await session.run(
      `MATCH (p:Proyecto {projectId: $projectId})
       OPTIONAL MATCH (leader:Usuario)-[:PERTENECE_A {rol: 'lider'}]->(p)
       OPTIONAL MATCH (p)-[:REQUIERE]->(s:Habilidad)
       WITH leader, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
       RETURN leader.userId AS leaderId, skills`,
      { projectId: id }
    );

    if (metaResult.records.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const record = metaResult.records[0];
    const leaderId = record.get('leaderId');
    const projectSkills = record.get('skills') || [];

    if (!Array.isArray(projectSkills) || projectSkills.length === 0) {
      // No hay habilidades requeridas -> no hay candidatos por skills (resultado válido)
      return res.json({ candidates: [] });
    }

    // Buscar usuarios que tengan al menos una de las habilidades del proyecto, excluyendo al líder
    const candidatesResult = await session.run(
      `UNWIND $skills AS skillName
       MATCH (candidate:Usuario)-[:TIENE_HABILIDAD]->(h:Habilidad {name: skillName})
       WHERE $leaderId IS NULL OR candidate.userId <> $leaderId
       RETURN DISTINCT candidate.userId AS userId`,
      { skills: projectSkills, leaderId }
    );

    const candidates = candidatesResult.records.map((r) => r.get('userId'));
    return res.json({ candidates });
  } catch (error: any) {
    console.error('GET /projects/:id/match/phase1', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await session.close();
  }
});

export default router;
