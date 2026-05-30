import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { TaskRepository, TaskService } from './task.service.js';
import { CreateTaskInput, Task, TaskReview, UpdateTaskInput } from './types/task.types.js';

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

    const updatedTask = {
      ...existingTask,
      ...input,
      assignedUserId: Object.prototype.hasOwnProperty.call(input, 'assignedUserId')
        ? input.assignedUserId ?? null
        : existingTask.assignedUserId
    };
    this.tasks.set(input.taskId, updatedTask);
    return updatedTask;
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
    repository.projectMembers.set('project-1', new Set(['leader-1', 'member-1', 'member-2']));
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

  it('aplica el flujo Kanban: miembro avanza hasta revision y el lider completa', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Flujo feliz',
      userAsigned: 'member-1'
    });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).resolves.toMatchObject({ status: 'en progreso' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en revision'
    })).resolves.toMatchObject({ status: 'en revision' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'completada'
    })).rejects.toBeInstanceOf(BadRequestError);

    await expect(service.updateTask('leader-1', task.taskId, {
      status: 'completada'
    })).resolves.toMatchObject({ status: 'completada' });
  });

  it('permite rechazar una tarea en revision devolviendola a en progreso', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Rechazo',
      userAsigned: 'member-1'
    });

    await service.updateTask('member-1', task.taskId, { status: 'en progreso' });
    await service.updateTask('member-1', task.taskId, { status: 'en revision' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).resolves.toMatchObject({ status: 'en progreso' });
  });

  it('impide que un miembro no asignado cambie el estado via PUT legado', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Asignada',
      userAsigned: 'member-1'
    });

    await expect(service.updateTask('member-2', task.taskId, {
      status: 'en progreso'
    })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.getTask('member-1', task.taskId)).resolves.toMatchObject({ status: 'pendiente' });
  });

  it('rechaza saltos fuera de la maquina de estados', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Saltos invalidos',
      userAsigned: 'member-1'
    });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en revision'
    })).rejects.toBeInstanceOf(BadRequestError);

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'completada'
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('no permite reabrir una tarea completada', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', {
      title: 'Terminal',
      userAsigned: 'member-1'
    });

    await service.updateTask('member-1', task.taskId, { status: 'en progreso' });
    await service.updateTask('member-1', task.taskId, { status: 'en revision' });
    await service.updateTask('leader-1', task.taskId, { status: 'completada' });

    await expect(service.updateTask('member-1', task.taskId, {
      status: 'en progreso'
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('impide que un miembro edite titulo o asignacion', async () => {
    const task = await service.createProjectTask('leader-1', 'project-1', { title: 'Solo lectura de campos' });

    await expect(service.updateTask('member-1', task.taskId, {
      title: 'Cambio no permitido'
    })).rejects.toBeInstanceOf(ForbiddenError);
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
});
