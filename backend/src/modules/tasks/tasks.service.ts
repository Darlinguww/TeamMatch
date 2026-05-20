import { randomUUID } from 'crypto';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { ReviewTaskDto } from './dto/review-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { TaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { ReviewTaskResult, UpdateTaskStatusResult } from './types/task.types.js';

export class TasksService {
  public constructor(private readonly taskRepository: TaskWorkflowRepository) {}

  public async updateStatus(taskId: string, actorUserId: string, input: UpdateTaskStatusDto): Promise<UpdateTaskStatusResult> {
    const statusUpdate = await this.taskRepository.updateStatus({
      taskId,
      actorUserId,
      status: input.status,
      normalizedStatus: this.normalizeStatusKey(input.status),
      eventId: randomUUID(),
      notificationId: randomUUID(),
      occurredAt: new Date().toISOString()
    });

    if (!statusUpdate) {
      throw new NotFoundError('Task not found');
    }

    if (!statusUpdate.actorCanUpdate) {
      throw new ForbiddenError('Only assigned users or project members can update task status');
    }

    return {
      task: statusUpdate.task,
      notification: statusUpdate.notification
    };
  }

  public async reviewTask(taskId: string, actorUserId: string, input: ReviewTaskDto): Promise<ReviewTaskResult> {
    const reviewResult = await this.taskRepository.reviewTask({
      taskId,
      actorUserId,
      decision: input.decision,
      comment: input.comment,
      eventId: randomUUID(),
      reviewedAt: new Date().toISOString()
    });

    if (!reviewResult) {
      throw new NotFoundError('Task not found');
    }

    if (!reviewResult.actorIsLeader) {
      throw new ForbiddenError('Only project leaders can review tasks');
    }

    return {
      task: reviewResult.task,
      review: reviewResult.review
    };
  }

  private normalizeStatusKey(status: string): string {
    return status.trim().toLowerCase().replace(/\s+/g, '_');
  }
}
