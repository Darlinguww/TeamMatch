import { beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { TaskRepository, TaskService } from './task.service.js';
import { CreateTaskInput, Task, TaskReview, UpdateTaskInput } from './types/task.types.js';

class StoryTaskRepository implements TaskRepository {
  public projectMembers = new Map<string, Set<string>>();
  public taskProjects = new Map<string, string>();
  public tasks = new Map<string, Task>();

  public async isUserInProject(userId: string, projectId: string): Promise<boolean> {
    return this.projectMembers.get(projectId)?.has(userId) ?? false;
  }

  public async isUserInProjectByTask(userId: string, taskId: string): Promise<boolean> {
    const projectId = this.taskProjects.get(taskId);
    return projectId ? this.isUserInProject(userId, projectId) : false;
  }

  public async isUserProjectLeader(userId: string, projectId: string): Promise<boolean> {
    return userId === 'leader-1' && (this.projectMembers.get(projectId)?.has(userId) ?? false);
  }

  public async isUserProjectLeaderByTask(userId: string, taskId: string): Promise<boolean> {
    const projectId = this.taskProjects.get(taskId);
    return projectId ? this.isUserProjectLeader(userId, projectId) : false;
  }

  public async getProjectIdForTask(taskId: string): Promise<string | null> {
    return this.taskProjects.get(taskId) ?? null;
  }

  public async findProjectLeaderId(projectId: string): Promise<string | null> {
    return this.projectMembers.has(projectId) ? 'leader-1' : null;
  }

  public async isTaskInProject(taskId: string): Promise<boolean> {
    return this.taskProjects.has(taskId);
  }

  public async createTask(input: CreateTaskInput): Promise<Task> {
    const task: Task = {
      taskId: `task-${this.tasks.size + 1}`,
      title: input.title,
      description: input.description,
      createdAt: '2026-05-17T00:00:00.000Z',
      status: 'pendiente',
      assignedUserId: input.assignedUserId,
      assignedUserEmail: input.assignedUserId ? `${input.assignedUserId}@example.com` : null
    };
    this.tasks.set(task.taskId, task);
    this.taskProjects.set(task.taskId, input.projectId);
    return task;
  }

  public async listProjectTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  public async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  public async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const existing = this.tasks.get(input.taskId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...input,
      assignedUserId: Object.prototype.hasOwnProperty.call(input, 'assignedUserId')
        ? input.assignedUserId ?? null
        : existing.assignedUserId
    };
    this.tasks.set(input.taskId, updated);
    return updated;
  }

  public async deleteTask(taskId: string): Promise<boolean> {
    this.taskProjects.delete(taskId);
    return this.tasks.delete(taskId);
  }

  public async createReview(): Promise<TaskReview | null> {
    return null;
  }
}

let repository: StoryTaskRepository;
let service: TaskService;

/**
 * HU-3: Como líder, asignar tareas a miembros con estados del tablero.
 */
describe('HU-3 — líder asigna tareas con estados Kanban', () => {
  beforeEach(() => {
    repository = new StoryTaskRepository();
    repository.projectMembers.set('project-1', new Set(['leader-1', 'member-1', 'member-2']));
    service = new TaskService(repository);
  });

  it('el líder crea una tarea en Pendiente asignada a un miembro', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Diseñar esquema Neo4j',
      userAsigned: 'member-1'
    });

    expect(task).toMatchObject({
      title: 'Diseñar esquema Neo4j',
      status: 'pendiente',
      assignedUserId: 'member-1'
    });
  });

  it('el miembro puede avanzar estados; el líder puede completar desde revisión', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Implementar endpoint',
      userAsigned: 'member-1'
    });

    await expect(service.updateTask('member-1', task.taskId, { status: 'en progreso' }))
      .resolves.toMatchObject({ status: 'en progreso' });

    await expect(service.updateTask('member-1', task.taskId, { status: 'en revision' }))
      .resolves.toMatchObject({ status: 'en revision' });

    await expect(service.updateTask('leader-1', task.taskId, { status: 'completada' }))
      .resolves.toMatchObject({ status: 'completada' });
  });

  it('un miembro no puede crear ni reasignar tareas', async () => {
    await expect(
      service.createProjectTask('member-1', 'project-1', { title: 'No permitido' })
    ).rejects.toBeInstanceOf(ForbiddenError);

    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Solo líder reasigna',
      userAsigned: 'member-1'
    });

    await expect(
      service.updateTask('member-1', task.taskId, { userAsigned: 'member-2' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
