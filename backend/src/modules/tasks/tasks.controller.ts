import { Request, Response } from 'express';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { ReviewTaskDto } from './dto/review-task.dto.js';
import { TaskParamsDto } from './dto/task-params.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { TasksService } from './tasks.service.js';

export class TasksController {
  public constructor(private readonly tasksService: TasksService) {}

  public updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const params = res.locals.taskParams as TaskParamsDto | undefined;

    if (!params) {
      throw new BadRequestError('Task route parameter validation is required');
    }

    const result = await this.tasksService.updateStatus(
      params.taskId,
      req.user.userId,
      req.body as UpdateTaskStatusDto
    );

    res.status(200).json(result);
  });

  public reviewTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const params = res.locals.taskParams as TaskParamsDto | undefined;

    if (!params) {
      throw new BadRequestError('Task route parameter validation is required');
    }

    const result = await this.tasksService.reviewTask(
      params.taskId,
      req.user.userId,
      req.body as ReviewTaskDto
    );

    res.status(200).json(result);
  });
}
