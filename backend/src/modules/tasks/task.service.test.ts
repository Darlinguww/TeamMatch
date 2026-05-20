import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import {
  CreateTaskInput,
  Task,
  TaskReview,
  UpdateTaskInput,
  UpdateTaskStatusOptimisticInput,
  UpdateTaskStatusOptimisticResult,
} from './types/task.types.js';
import { TaskRepository, TaskService } from './task.service.js';

class FakeTaskRepository implements TaskRepository {
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
      version: 1,
      assignedUserId: input.assignedUserId,
      assignedUserEmail: input.assignedUserId ? `${input.assignedUserId}@example.com` : null
    };
    this.tasks.set(task.taskId, task);
    this.taskProjects.set(task.taskId, input.projectId);
    return task;
  }

  public async listProjectTasks(projectId: string, status?: Task['status']): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((task) => (
      this.taskProjects.get(task.taskId) === projectId &&
      (status === undefined || task.status === status)
    ));
  }

  public async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  public async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const existingTask = this.tasks.get(input.taskId);

    if (!existingTask) {
      return null;
    }

    const updatedTask: Task = {
      ...existingTask,
      title: input.title ?? existingTask.title,
      description: input.description ?? existingTask.description,
      status: input.status ?? existingTask.status,
      assignedUserId: Object.prototype.hasOwnProperty.call(input, 'assignedUserId')
        ? input.assignedUserId ?? null
        : existingTask.assignedUserId,
      version: existingTask.version,
    };
    this.tasks.set(input.taskId, updatedTask);
    return updatedTask;
  }

  public async getTaskProjectId(taskId: string): Promise<string | null> {
    return this.taskProjects.get(taskId) ?? null;
  }

  public async updateTaskStatusOptimistic(
    input: UpdateTaskStatusOptimisticInput,
  ): Promise<UpdateTaskStatusOptimisticResult> {
    const task = this.tasks.get(input.taskId);
    if (!task) {
      return { conflict: true };
    }
    if (task.status !== input.expectedStatus || task.version !== input.expectedVersion) {
      return { conflict: true };
    }
    const updated: Task = {
      ...task,
      status: input.newStatus,
      version: task.version + 1,
    };
    this.tasks.set(input.taskId, updated);
    return {
      conflict: false,
      projectId: input.projectId,
      task: updated,
    };
  }

  public async deleteTask(taskId: string): Promise<boolean> {
    this.taskProjects.delete(taskId);
    return this.tasks.delete(taskId);
  }

  public async createReview(taskId: string, reviewerId: string, rating: number, comment: string): Promise<TaskReview | null> {
    if (!this.tasks.has(taskId)) {
      return null;
    }

    return {
      userId: reviewerId,
      taskId,
      score: rating,
      feedback: comment,
      createdAt: '2026-05-17T00:00:00.000Z'
    };
  }
}

let repository: FakeTaskRepository;
let service: TaskService;

describe('TaskService seguridad y estados', () => {
  beforeEach(() => {
    repository = new FakeTaskRepository();
    repository.projectMembers.set('project-1', new Set(['leader-1', 'member-1']));
    service = new TaskService(repository);
  });

  it('crea tareas solo si el usuario y el asignado pertenecen al proyecto', async () => {
    await expect(service.createProjectTask('leader-1', 'project-1', {
      title: 'Implementar CRUD',
      userAsigned: 'member-1'
    })).resolves.toMatchObject({
      title: 'Implementar CRUD',
      status: 'pendiente',
      assignedUserId: 'member-1'
    });

    await expect(service.createProjectTask('leader-1', 'project-1', {
      title: 'Tarea IDOR',
      userAsigned: 'outsider-1'
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rechaza estados invalidos con 400', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Revisar estado' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'bloqueada'
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('aplica el flujo pendiente -> en progreso -> en revision -> completada', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Flujo feliz' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).resolves.toMatchObject({ status: 'en progreso' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en revision'
    })).resolves.toMatchObject({ status: 'en revision' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'completada'
    })).resolves.toMatchObject({ status: 'completada' });
  });

  it('permite rechazar una tarea en revision devolviendola a en progreso', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Rechazo' });

    await service.updateTask('member-1', task.taskId, { status: 'en progreso' });
    await service.updateTask('member-1', task.taskId, { status: 'en revision' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).resolves.toMatchObject({ status: 'en progreso' });
  });

  it('rechaza saltos fuera de la maquina de estados', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Saltos invalidos' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en revision'
    })).rejects.toBeInstanceOf(BadRequestError);

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'completada'
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('no permite reabrir una tarea completada', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Terminal' });

    await service.updateTask('member-1', task.taskId, { status: 'en progreso' });
    await service.updateTask('member-1', task.taskId, { status: 'en revision' });
    await service.updateTask('member-1', task.taskId, { status: 'completada' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('protege lectura, actualizacion y borrado contra IDOR', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Privada' });

    await expect(service.getTask('outsider-1', task.taskId)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.updateTask('outsider-1', task.taskId, { status: 'completada' })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.deleteTask('outsider-1', task.taskId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('impide reasignar tareas a usuarios fuera del proyecto', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Reasignar' });

    await expect(service.updateTask('leader-1', task.taskId, {
      userAsigned: 'outsider-1'
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('distingue tareas inexistentes de tareas sin permiso', async () => {
    await expect(service.getTask('leader-1', 'missing-task')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updateTaskStatusViaSocket aplica transicion y version', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Socket' });

    const updated = await service.updateTaskStatusViaSocket('member-1', {
      projectId: 'project-1',
      taskId: task.taskId,
      expectedStatus: 'pendiente',
      expectedVersion: 1,
      newStatus: 'en progreso',
    });

    expect(updated.status).toBe('en progreso');
    expect(updated.version).toBe(2);
  });

  it('updateTaskStatusViaSocket lanza ConflictError si la version no coincide', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Race' });

    await expect(
      service.updateTaskStatusViaSocket('member-1', {
        projectId: 'project-1',
        taskId: task.taskId,
        expectedStatus: 'pendiente',
        expectedVersion: 99,
        newStatus: 'en progreso',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
