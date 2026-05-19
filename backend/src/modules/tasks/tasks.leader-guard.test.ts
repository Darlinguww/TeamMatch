import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { TaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { TasksService } from './tasks.service.js';

describe('TasksService — aprobación solo por líder', () => {
  it('lanza ForbiddenError cuando el repositorio marca actorIsLeader = false', async () => {
    const mockRepo = {
      reviewTask: vi.fn().mockResolvedValue({
        actorIsLeader: false,
        task: {
          taskId: 't1',
          status: 'In Review',
          title: 'Task',
          projectId: 'p1',
          updatedAt: new Date().toISOString()
        },
        review: null
      })
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);

    await expect(
      service.reviewTask('t1', 'member-1', { decision: 'approved', comment: null })
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockRepo.reviewTask).toHaveBeenCalledOnce();
  });
});
