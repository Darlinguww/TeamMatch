import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { validateDto } from '../../shared/middlewares/validateDto.js';
import { validateReviewTaskDto } from './dto/review-task.dto.js';
import { TaskParamsDto, validateTaskParams } from './dto/task-params.dto.js';
import { validateUpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { Neo4jTaskRepository } from './repositories/task.repository.js';
import { Neo4jTaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { TaskService } from './task.service.js';
import { TaskWorkflowService } from './task-workflow.service.js';

const router = Router();
const taskService = new TaskService(new Neo4jTaskRepository());
const taskWorkflowService = new TaskWorkflowService(new Neo4jTaskWorkflowRepository());

function validateTaskRouteParams(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateTaskParams(req.params);

  if (validationResult.issues.length > 0) {
    next(new BadRequestError('Validation failed', validationResult.issues));
    return;
  }

  res.locals.taskParams = validationResult.value satisfies TaskParamsDto;
  next();
}

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

router.patch(
  '/:taskId/status',
  requireAuth,
  validateTaskRouteParams,
  validateDto(validateUpdateTaskStatusDto),
  asyncHandler(async (req, res) => {
    const params = res.locals.taskParams as TaskParamsDto;
    const result = await taskWorkflowService.updateStatus(params.taskId, req.user!.userId, req.body);
    res.status(200).json(result);
  })
);

router.post(
  '/:taskId/review',
  requireAuth,
  validateTaskRouteParams,
  validateDto(validateReviewTaskDto),
  asyncHandler(async (req, res) => {
    const params = res.locals.taskParams as TaskParamsDto;
    const result = await taskWorkflowService.reviewTask(params.taskId, req.user!.userId, req.body);
    res.status(200).json(result);
  })
);

export default router;
