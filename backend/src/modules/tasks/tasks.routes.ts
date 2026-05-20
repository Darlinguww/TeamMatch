import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { Neo4jTaskRepository } from './repositories/task.repository.js';
import { TaskService } from './task.service.js';

const router = Router();
const taskService = new TaskService(new Neo4jTaskRepository());

router.get('/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.user!.userId, req.params.taskId);
  res.status(200).json(task);
}));

router.put('/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.user!.userId, req.params.taskId, req.body ?? {});
  res.status(200).json(task);
}));

router.delete('/:taskId', requireAuth, asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user!.userId, req.params.taskId);
  res.status(200).json({ message: 'Tarea eliminada correctamente' });
}));

export default router;
