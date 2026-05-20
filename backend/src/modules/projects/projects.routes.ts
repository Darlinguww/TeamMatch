import { Router } from 'express';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { Neo4jTaskRepository } from '../tasks/repositories/task.repository.js';
import { TaskService } from '../tasks/task.service.js';
import { ParticipationRepository } from '../participation/participation.repository.js';
import { ParticipationService } from '../participation/participation.service.js';
import { Neo4jProjectRepository } from './repositories/project.repository.js';
import { ProjectService } from './project.service.js';

const router = Router();
const projectService = new ProjectService(new Neo4jProjectRepository());
const participationService = new ParticipationService(new ParticipationRepository());
const taskService = new TaskService(new Neo4jTaskRepository());

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { projectId } = await projectService.createProject(req.user!.userId, req.body ?? {});
  const project = await projectService.getProject(req.user!.userId, projectId);
  res.status(201).json({ projectId, project });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects(req.user!.userId);
  res.status(200).json({ projects });
}));

router.get('/open', requireAuth, asyncHandler(async (req, res) => {
  const projects = await projectService.listOpenProjects(req.user!.userId);
  res.status(200).json({ projects });
}));

router.get('/:id/participation-status', requireAuth, asyncHandler(async (req, res) => {
  const status = await participationService.getParticipationStatus(req.params.id, req.user!.userId);
  res.status(200).json(status);
}));

router.post('/:id/join-requests', requireAuth, asyncHandler(async (req, res) => {
  const request = await participationService.requestJoinProject(
    req.user!.userId,
    req.params.id,
    req.body?.message
  );
  res.status(201).json({ request });
}));

router.post('/:id/role-applications', requireAuth, asyncHandler(async (req, res) => {
  const request = await participationService.applyToRole(
    req.user!.userId,
    req.params.id,
    req.body?.roleName,
    req.body?.message
  );
  res.status(201).json({ request });
}));

/** @deprecated Use POST /:id/join-requests — creates a pending request for leader approval */
router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const request = await participationService.requestJoinProject(
    req.user!.userId,
    req.params.id,
    req.body?.message
  );
  res.status(201).json({ request, message: 'Solicitud enviada. El líder la revisará en Alertas.' });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.user!.userId, req.params.id);
  res.status(200).json(project);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.user!.userId, req.params.id, req.body ?? {});
  res.status(200).json({ projectId: project.id, project });
}));

router.patch('/:id/kanban-state', requireAuth, asyncHandler(async (req, res) => {
  const kanban = await projectService.updateProjectKanban(req.user!.userId, req.params.id, req.body ?? {});
  res.status(200).json({ kanban });
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
