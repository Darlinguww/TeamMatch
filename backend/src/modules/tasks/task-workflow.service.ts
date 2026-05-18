import { randomUUID } from 'crypto';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { ReviewTaskDto } from './dto/review-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { Neo4jTaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { ReviewTaskWorkflowResult, UpdateTaskWorkflowStatusResult } from './types/task.types.js';

export class TaskWorkflowService {
  public constructor(private readonly repository: Neo4jTaskWorkflowRepository) {}

  public async updateStatus(
    taskId: string,
    actorUserId: string,
    input: UpdateTaskStatusDto
  ): Promise<UpdateTaskWorkflowStatusResult> {
    const statusUpdate = await this.repository.updateStatus({
      taskId,
      actorUserId,
      status: input.status,
      normalizedStatus: this.normalizeStatusKey(input.status),
      eventId: randomUUID(),
      notificationId: randomUUID(),
      occurredAt: new Date().toISOString()
    });

    if (!statusUpdate) {
      throw new NotFoundError('Tarea no encontrada');
    }

    if (!statusUpdate.actorCanUpdate) {
      throw new ForbiddenError('Solo miembros asignados o del proyecto pueden actualizar el estado');
    }

    return {
      task: statusUpdate.task,
      notification: statusUpdate.notification
    };
  }

  public async reviewTask(
    taskId: string,
    actorUserId: string,
    input: ReviewTaskDto
  ): Promise<ReviewTaskWorkflowResult> {
    const reviewResult = await this.repository.reviewTask({
      taskId,
      actorUserId,
      decision: input.decision,
      comment: input.comment,
      eventId: randomUUID(),
      reviewedAt: new Date().toISOString()
    });

    if (!reviewResult) {
      throw new NotFoundError('Tarea no encontrada');
    }

    if (!reviewResult.actorIsLeader) {
      throw new ForbiddenError('Solo el lider del proyecto puede revisar tareas');
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
