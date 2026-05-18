import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TaskWorkflowService } from './task-workflow.service.js';
import {
  ReviewTaskWorkflowResult,
  TaskLeaderReviewSummary,
  TaskWorkflowSummary,
  UpdateTaskWorkflowStatusResult
} from './types/task.types.js';

class FakeTaskWorkflowRepository {
  public updateResult: (UpdateTaskWorkflowStatusResult & { actorCanUpdate: boolean }) | null = null;
  public reviewResult: (ReviewTaskWorkflowResult & { actorIsLeader: boolean }) | null = null;

  public async updateStatus(): Promise<(UpdateTaskWorkflowStatusResult & { actorCanUpdate: boolean }) | null> {
    return this.updateResult;
  }

  public async reviewTask(): Promise<(ReviewTaskWorkflowResult & { actorIsLeader: boolean }) | null> {
    return this.reviewResult;
  }
}

const sampleTask: TaskWorkflowSummary = {
  taskId: 'task-1',
  title: 'Implement feature',
  status: 'en revision',
  previousStatus: 'en progreso',
  projectId: 'project-1',
  updatedAt: '2026-05-18T00:00:00.000Z'
};

describe('TaskWorkflowService', () => {
  it('actualiza el estado cuando el actor puede modificar la tarea', async () => {
    const repository = new FakeTaskWorkflowRepository();
    repository.updateResult = {
      task: sampleTask,
      notification: null,
      actorCanUpdate: true
    };
    const service = new TaskWorkflowService(repository as never);

    const result = await service.updateStatus('task-1', 'member-1', { status: 'en revision' });

    expect(result.task.status).toBe('en revision');
  });

  it('rechaza actualizacion de estado sin permisos', async () => {
    const repository = new FakeTaskWorkflowRepository();
    repository.updateResult = {
      task: sampleTask,
      notification: null,
      actorCanUpdate: false
    };
    const service = new TaskWorkflowService(repository as never);

    await expect(
      service.updateStatus('task-1', 'outsider-1', { status: 'en revision' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('revisa tarea cuando el actor es lider', async () => {
    const repository = new FakeTaskWorkflowRepository();
    const review: TaskLeaderReviewSummary = {
      eventId: 'event-1',
      decision: 'approved',
      comment: 'Bien hecho',
      reviewedAt: '2026-05-18T00:00:00.000Z',
      reviewedBy: 'leader-1'
    };
    repository.reviewResult = {
      task: { ...sampleTask, status: 'completada' },
      review,
      actorIsLeader: true
    };
    const service = new TaskWorkflowService(repository as never);

    const result = await service.reviewTask('task-1', 'leader-1', {
      decision: 'approved',
      comment: 'Bien hecho'
    });

    expect(result.review.decision).toBe('approved');
  });

  it('rechaza revision cuando el actor no es lider', async () => {
    const repository = new FakeTaskWorkflowRepository();
    repository.reviewResult = {
      task: sampleTask,
      review: {
        eventId: 'event-1',
        decision: 'approved',
        comment: null,
        reviewedAt: '2026-05-18T00:00:00.000Z',
        reviewedBy: 'member-1'
      },
      actorIsLeader: false
    };
    const service = new TaskWorkflowService(repository as never);

    await expect(
      service.reviewTask('task-1', 'member-1', { decision: 'approved', comment: null })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lanza NotFoundError si la tarea no existe', async () => {
    const repository = new FakeTaskWorkflowRepository();
    repository.reviewResult = null;
    const service = new TaskWorkflowService(repository as never);

    await expect(
      service.reviewTask('missing', 'leader-1', { decision: 'rejected', comment: null })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
