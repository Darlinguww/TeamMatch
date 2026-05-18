import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { BadRequestError } from '../../shared/errors/HttpErrors.js';
import { validateDto } from '../../shared/middlewares/validateDto.js';
import { validateReviewTaskDto } from './dto/review-task.dto.js';
import { TaskParamsDto, validateTaskParams } from './dto/task-params.dto.js';
import { validateUpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { TaskRepository } from './repositories/task.repository.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

const router = Router();
const taskRepository = new TaskRepository();
const tasksService = new TasksService(taskRepository);
const tasksController = new TasksController(tasksService);

function validateTaskRouteParams(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateTaskParams(req.params);

  if (validationResult.issues.length > 0) {
    next(new BadRequestError('Validation failed', validationResult.issues));
    return;
  }

  res.locals.taskParams = validationResult.value satisfies TaskParamsDto;
  next();
}

router.patch(
  '/:id/status',
  requireAuth,
  validateTaskRouteParams,
  validateDto(validateUpdateTaskStatusDto),
  tasksController.updateStatus
);
router.post(
  '/:id/review',
  requireAuth,
  validateTaskRouteParams,
  validateDto(validateReviewTaskDto),
  tasksController.reviewTask
);

export default router;
