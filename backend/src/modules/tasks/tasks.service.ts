import { randomUUID } from 'crypto';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { ReviewTaskDto } from './dto/review-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { TaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { ReviewTaskResult, UpdateTaskStatusResult } from './types/task.types.js';

export class TasksService {
  public constructor(private readonly taskRepository: TaskWorkflowRepository) {}

  public async updateStatus(taskId: string, actorUserId: string, input: UpdateTaskStatusDto): Promise<UpdateTaskStatusResult> {
    const canonicalStatus = this.toCanonicalStatus(input.status);
    const statusUpdate = await this.taskRepository.updateStatus({
      taskId,
      actorUserId,
      status: canonicalStatus,
      normalizedStatus: this.normalizeStatusKey(canonicalStatus),
      eventId: randomUUID(),
      notificationId: randomUUID(),
      occurredAt: new Date().toISOString()
    });

    if (!statusUpdate) {
      throw new NotFoundError('Task not found');
    }

    if (!statusUpdate.actorCanUpdate) {
      throw new ForbiddenError(
        'No tienes permiso para esta transición. El asignado puede mover Pendiente→En progreso y En progreso→En revisión; el líder aprueba o devuelve desde revisión.'
      );
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
      notificationId: randomUUID(),
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
      review: reviewResult.review,
      notification: reviewResult.notification
    };
  }

  private normalizeStatusKey(status: string): string {
    return status.trim().toLowerCase().replace(/\s+/g, '_').replace(/ó/g, 'o');
  }

  private toCanonicalStatus(status: string): string {
    const normalized = this.normalizeStatusKey(status);

    if (['pending', 'pendiente'].includes(normalized)) {
      return 'pendiente';
    }
    if (['in_progress', 'en_progreso'].includes(normalized)) {
      return 'en progreso';
    }
    if (['in_review', 'en_revision'].includes(normalized)) {
      return 'en revision';
    }
    if (['completed', 'completada'].includes(normalized)) {
      return 'completada';
    }

    return status.trim();
  }
}
