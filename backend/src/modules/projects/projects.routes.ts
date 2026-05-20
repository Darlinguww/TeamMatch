import { Router } from 'express';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { Neo4jTaskRepository } from '../tasks/repositories/task.repository.js';
import { TaskService } from '../tasks/task.service.js';
import { Neo4jProjectRepository } from './repositories/project.repository.js';
import { ProjectService } from './project.service.js';

const router = Router();
const projectService = new ProjectService(new Neo4jProjectRepository());
const taskService = new TaskService(new Neo4jTaskRepository());

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await projectService.createProject(req.user!.userId, req.body ?? {});
  res.status(201).json(result);
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects(req.user!.userId);
  res.status(200).json({ projects });
}));

router.get('/open', requireAuth, asyncHandler(async (_req, res) => {
  const projects = await projectService.listOpenProjects();
  res.status(200).json({ projects });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.user!.userId, req.params.id);
  res.status(200).json(project);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await projectService.updateProject(req.user!.userId, req.params.id, req.body ?? {});
  res.status(200).json(result);
}));

router.get('/:id/match/phase1', requireAuth, asyncHandler(async (req, res) => {
  const candidates = await projectService.findPhaseOneCandidates(req.user!.userId, req.params.id);
  res.status(200).json({ candidates });
}));

router.post('/match/phase2/rebuild-semantic-index', requireAuth, asyncHandler(async (req, res) => {
  const rebuildSecret = req.header('X-GDS-Rebuild-Secret')?.trim() ?? '';
  if (!env.gdsRebuildSecret || rebuildSecret !== env.gdsRebuildSecret) {
    throw new ForbiddenError('GDS semantic index rebuild is restricted');
  }

  const result = await projectService.rebuildSemanticIndex(req.body ?? {});
  res.status(200).json(result);
}));

router.get('/:id/match/phase2', requireAuth, asyncHandler(async (req, res) => {
  const result = await projectService.findPhaseTwoCandidates(req.user!.userId, req.params.id);
  res.status(200).json(result);
}));

router.post('/:projectId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const task = await taskService.createProjectTask(req.user!.userId, req.params.projectId, req.body ?? {});
  res.status(201).json(task);
}));

router.get('/:projectId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const tasks = await taskService.listProjectTasks(req.user!.userId, req.params.projectId, req.query.status);
  res.status(200).json(tasks);
}));

router.post('/:taskId/reviews', requireAuth, asyncHandler(async (req, res) => {
  const review = await taskService.createReview(req.user!.userId, req.params.taskId, req.body ?? {});
  res.status(201).json(review);
}));

export default router;
