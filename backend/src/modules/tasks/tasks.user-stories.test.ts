import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TaskWorkflowRepository } from './repositories/task-workflow.repository.js';
import { TasksService } from './tasks.service.js';

const baseTask = {
  taskId: 'task-1',
  title: 'Entrega sprint',
  projectId: 'project-1',
  previousStatus: 'en progreso',
  updatedAt: new Date().toISOString()
};

/**
 * HU-2, HU-4, HU-5 — workflow Kanban vía TasksService (PATCH status / POST review).
 */
describe('HU-2 — notificación al líder cuando la tarea entra en revisión', () => {
  it('notifica al líder al pasar a en revision (Para revisión)', async () => {
    const mockRepo = {
      updateStatus: vi.fn().mockResolvedValue({
        actorCanUpdate: true,
        task: { ...baseTask, status: 'en revision' },
        notification: {
          notificationId: 'n1',
          type: 'TASK_IN_REVIEW',
          message: 'Una tarea fue enviada a revision',
          createdAt: new Date().toISOString(),
          read: false,
          recipientUserId: 'leader-1'
        }
      }),
      reviewTask: vi.fn()
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);
    const result = await service.updateStatus('task-1', 'member-1', { status: 'Para Revisión' });

    expect(result.task.status).toBe('en revision');
    expect(result.notification).toMatchObject({
      type: 'TASK_IN_REVIEW',
      recipientUserId: 'leader-1'
    });
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'en revision',
        normalizedStatus: 'en_revision'
      })
    );
  });
});

describe('HU-4 — miembro avanza En proceso → Para revisión', () => {
  it('permite al miembro mover de en progreso a en revision', async () => {
    const mockRepo = {
      updateStatus: vi.fn().mockResolvedValue({
        actorCanUpdate: true,
        task: { ...baseTask, status: 'en revision', previousStatus: 'en progreso' },
        notification: {
          notificationId: 'n2',
          type: 'TASK_IN_REVIEW',
          message: 'Una tarea fue enviada a revision',
          createdAt: new Date().toISOString(),
          read: false,
          recipientUserId: 'leader-1'
        }
      }),
      reviewTask: vi.fn()
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);
    const result = await service.updateStatus('task-1', 'member-1', { status: 'en revision' });

    expect(result.task.status).toBe('en revision');
    expect(result.notification?.type).toBe('TASK_IN_REVIEW');
  });

  it('rechaza transiciones no permitidas para el miembro', async () => {
    const mockRepo = {
      updateStatus: vi.fn().mockResolvedValue({
        actorCanUpdate: false,
        task: { ...baseTask, status: 'en progreso' },
        notification: null
      }),
      reviewTask: vi.fn()
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);

    await expect(
      service.updateStatus('task-1', 'member-1', { status: 'completada' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('HU-5 — líder aprueba o rechaza tareas en revisión', () => {
  it('aprueba con comentario opcional', async () => {
    const mockRepo = {
      updateStatus: vi.fn(),
      reviewTask: vi.fn().mockResolvedValue({
        actorIsLeader: true,
        task: { ...baseTask, status: 'completada' },
        review: {
          eventId: 'e1',
          decision: 'approved',
          comment: 'Buen trabajo',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'leader-1'
        },
        notification: {
          notificationId: 'n3',
          type: 'TASK_APPROVED',
          message: 'Tu tarea fue revisada y movida a Completada',
          createdAt: new Date().toISOString(),
          read: false,
          recipientUserId: 'member-1'
        }
      })
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);
    const result = await service.reviewTask('task-1', 'leader-1', {
      decision: 'approved',
      comment: 'Buen trabajo'
    });

    expect(result.review).toMatchObject({ decision: 'approved', reviewedBy: 'leader-1' });
    expect(result.task.status).toBe('completada');
    expect(mockRepo.reviewTask).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'approved', comment: 'Buen trabajo' })
    );
  });

  it('rechaza y devuelve feedback al asignado', async () => {
    const mockRepo = {
      updateStatus: vi.fn(),
      reviewTask: vi.fn().mockResolvedValue({
        actorIsLeader: true,
        task: { ...baseTask, status: 'en progreso' },
        review: {
          eventId: 'e2',
          decision: 'rejected',
          comment: 'Faltan pruebas',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'leader-1'
        },
        notification: {
          notificationId: 'n4',
          type: 'TASK_RETURNED',
          message: 'Tu tarea fue revisada y devuelta a En progreso',
          createdAt: new Date().toISOString(),
          read: false,
          recipientUserId: 'member-1'
        }
      })
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);
    const result = await service.reviewTask('task-1', 'leader-1', {
      decision: 'rejected',
      comment: 'Faltan pruebas'
    });

    expect(result.review?.decision).toBe('rejected');
    expect(result.notification?.type).toBe('TASK_RETURNED');
  });

  it('impide que un miembro apruebe o rechace', async () => {
    const mockRepo = {
      updateStatus: vi.fn(),
      reviewTask: vi.fn().mockResolvedValue({
        actorIsLeader: false,
        task: { ...baseTask, status: 'en revision' },
        review: null,
        notification: null
      })
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);

    await expect(
      service.reviewTask('task-1', 'member-1', { decision: 'approved', comment: null })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('devuelve 404 si la tarea no existe', async () => {
    const mockRepo = {
      updateStatus: vi.fn().mockResolvedValue(null),
      reviewTask: vi.fn().mockResolvedValue(null)
    } as unknown as TaskWorkflowRepository;

    const service = new TasksService(mockRepo);
    await expect(
      service.updateStatus('missing', 'member-1', { status: 'en revision' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
