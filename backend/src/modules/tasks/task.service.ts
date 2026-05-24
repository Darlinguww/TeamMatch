import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { CreateTaskInput, TASK_STATUSES, Task, TaskReview, TaskStatus, UpdateTaskInput } from './types/task.types.js';

/** Transiciones que puede hacer un miembro (Kanban: avanza hasta revisión). */
const MEMBER_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pendiente: ['en progreso'],
  'en progreso': ['en revision'],
  'en revision': ['en progreso'],
  completada: []
};

/** Transiciones del líder (incluye aprobar completada desde revisión). */
const LEADER_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pendiente: ['en progreso'],
  'en progreso': ['en revision'],
  'en revision': ['en progreso', 'completada'],
  completada: []
};

export interface TaskRepository {
  isUserInProject(userId: string, projectId: string): Promise<boolean>;
  isUserInProjectByTask(userId: string, taskId: string): Promise<boolean>;
  isUserProjectLeader?(userId: string, projectId: string): Promise<boolean>;
  isUserProjectLeaderByTask?(userId: string, taskId: string): Promise<boolean>;
  findProjectLeaderId?(projectId: string): Promise<string | null>;
  isTaskInProject(taskId: string): Promise<boolean>;
  getProjectIdForTask?(taskId: string): Promise<string | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  listProjectTasks(projectId: string, status?: TaskStatus): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  updateTask(input: UpdateTaskInput): Promise<Task | null>;
  deleteTask(taskId: string): Promise<boolean>;
  createReview(taskId: string, reviewerId: string, rating: number, comment: string): Promise<TaskReview | null>;
}

export class TaskService {
  public constructor(private readonly repository: TaskRepository) {}

  public async createProjectTask(
    userId: string,
    projectId: string,
    input: {
      title?: unknown;
      description?: unknown;
      userAsigned?: unknown;
      assignedUserId?: unknown;
      sprint?: unknown;
    }
  ): Promise<Task> {
    const title = this.parseTitle(input.title);
    const description = this.parseOptionalText(input.description);
    const assignedUserId = this.parseOptionalUserId(input.assignedUserId ?? input.userAsigned);
    const sprint = this.parseOptionalSprint(input.sprint);

    const normalizedProjectId = projectId.trim();
    await this.ensureProjectLeader(userId, normalizedProjectId);

    if (assignedUserId) {
      await this.ensureProjectAccess(assignedUserId, normalizedProjectId);
    }

    return this.repository.createTask({
      projectId: normalizedProjectId,
      title,
      description,
      assignedUserId,
      sprint,
    });
  }

  public async listProjectTasks(userId: string, projectId: string, rawStatus?: unknown): Promise<Task[]> {
    const normalizedProjectId = projectId.trim();
    await this.ensureProjectAccess(userId, normalizedProjectId);
    const status = rawStatus === undefined ? undefined : this.parseStatus(rawStatus);
    return this.repository.listProjectTasks(normalizedProjectId, status);
  }

  public async getTask(userId: string, taskId: string): Promise<Task> {
    await this.ensureTaskAccess(userId, taskId);
    const task = await this.repository.getTask(taskId);

    if (!task) {
      throw new NotFoundError('Tarea no encontrada');
    }

    return task;
  }

  public async updateTask(
    userId: string,
    taskId: string,
    input: {
      title?: unknown;
      description?: unknown;
      status?: unknown;
      sprint?: unknown;
      userAsigned?: unknown;
      assignedUserId?: unknown;
    }
  ): Promise<Task> {
    await this.ensureTaskAccess(userId, taskId);
    const currentTask = await this.repository.getTask(taskId);

    if (!currentTask) {
      throw new NotFoundError('Tarea no encontrada');
    }

    const isLeader = await this.isUserLeaderForTask(userId, taskId);
    const touchesNonStatusFields =
      Object.prototype.hasOwnProperty.call(input, 'title') ||
      Object.prototype.hasOwnProperty.call(input, 'description') ||
      Object.prototype.hasOwnProperty.call(input, 'assignedUserId') ||
      Object.prototype.hasOwnProperty.call(input, 'userAsigned') ||
      Object.prototype.hasOwnProperty.call(input, 'sprint');

    if (touchesNonStatusFields && !isLeader) {
      throw new ForbiddenError('Only project leaders can manage task details');
    }

    const patch: UpdateTaskInput = { taskId };
    if (Object.prototype.hasOwnProperty.call(input, 'title')) {
      patch.title = this.parseTitle(input.title);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'description')) {
      patch.description = this.parseOptionalText(input.description);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'status')) {
      patch.status = this.parseStatus(input.status);
      if (!isLeader && currentTask.assignedUserId !== userId) {
        throw new ForbiddenError('Only assigned members can update task status');
      }
      const transitions = isLeader ? LEADER_STATUS_TRANSITIONS : MEMBER_STATUS_TRANSITIONS;
      this.ensureValidStatusTransition(currentTask.status, patch.status, transitions);
    }
    if (
      Object.prototype.hasOwnProperty.call(input, 'assignedUserId') ||
      Object.prototype.hasOwnProperty.call(input, 'userAsigned')
    ) {
      patch.assignedUserId = this.parseOptionalUserId(input.assignedUserId ?? input.userAsigned);

      if (patch.assignedUserId) {
        await this.ensureTaskAccess(patch.assignedUserId, taskId);
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'sprint')) {
      patch.sprint = this.parseOptionalSprint(input.sprint);
    }

    const updatedTask = await this.repository.updateTask(patch);
    if (!updatedTask) {
      throw new NotFoundError('Tarea no encontrada');
    }

    return updatedTask;
  }

  public async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.ensureTaskLeader(userId, taskId);
    const deleted = await this.repository.deleteTask(taskId);

    if (!deleted) {
      throw new NotFoundError('Tarea no encontrada');
    }
  }

  public async createReview(
    reviewerId: string,
    taskId: string,
    input: { rating?: unknown; comment?: unknown }
  ): Promise<TaskReview> {
    if (typeof input.rating !== 'number' || !Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new BadRequestError('La calificacion debe ser un numero entre 1 y 5');
    }

    await this.ensureTaskAccess(reviewerId, taskId);

    const review = await this.repository.createReview(
      taskId,
      reviewerId,
      input.rating,
      this.parseOptionalText(input.comment)
    );

    if (!review) {
      throw new NotFoundError('Tarea no encontrada');
    }

    return review;
  }

  private async ensureProjectAccess(userId: string, projectId: string): Promise<void> {
    const hasAccess = await this.repository.isUserInProject(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenError('Forbidden');
    }
  }

  private async ensureProjectLeader(userId: string, projectId: string): Promise<void> {
    if (this.repository.isUserProjectLeader) {
      const isLeader = await this.repository.isUserProjectLeader(userId, projectId);
      if (!isLeader) {
        throw new ForbiddenError('Only project leaders can manage tasks');
      }
      return;
    }

    await this.ensureProjectAccess(userId, projectId);
  }

  private async ensureTaskLeader(userId: string, taskId: string): Promise<void> {
    const taskExists = await this.repository.isTaskInProject(taskId);
    if (!taskExists) {
      throw new NotFoundError('Tarea no encontrada');
    }

    if (await this.isUserLeaderForTask(userId, taskId)) {
      return;
    }

    throw new ForbiddenError('Only project leaders can manage tasks');
  }

  private async isUserLeaderForTask(userId: string, taskId: string): Promise<boolean> {
    if (this.repository.isUserProjectLeaderByTask) {
      const byTask = await this.repository.isUserProjectLeaderByTask(userId, taskId);
      if (byTask) return true;
    }

    if (this.repository.getProjectIdForTask) {
      const projectId = await this.repository.getProjectIdForTask(taskId);
      if (projectId) {
        if (this.repository.isUserProjectLeader) {
          const isLeader = await this.repository.isUserProjectLeader(userId, projectId);
          if (isLeader) return true;
        }

        if (this.repository.findProjectLeaderId) {
          const leaderId = await this.repository.findProjectLeaderId(projectId);
          if (leaderId && leaderId === userId) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private async ensureTaskAccess(userId: string, taskId: string): Promise<void> {
    const taskExists = await this.repository.isTaskInProject(taskId);
    if (!taskExists) {
      throw new NotFoundError('Tarea no encontrada');
    }

    const hasAccess = await this.repository.isUserInProjectByTask(userId, taskId);
    if (!hasAccess) {
      throw new ForbiddenError('Forbidden');
    }
  }

  private parseTitle(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError('El titulo de la tarea es requerido');
    }

    return value.trim();
  }

  private parseOptionalText(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value !== 'string') {
      throw new BadRequestError('El texto debe ser una cadena');
    }

    return value.trim();
  }

  private parseOptionalSprint(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const sprint = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(sprint) || sprint < 1 || sprint > 99) {
      throw new BadRequestError('El sprint debe ser un número entre 1 y 99');
    }

    return Math.floor(sprint);
  }

  private parseOptionalUserId(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError('El usuario asignado no es valido');
    }

    return value.trim();
  }

  private parseStatus(value: unknown): TaskStatus {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError('Estado no valido');
    }

    const raw = value.trim();
    if (TASK_STATUSES.includes(raw as TaskStatus)) {
      return raw as TaskStatus;
    }

    const normalized = raw.toLowerCase().replace(/_/g, ' ');
    const aliases: Record<string, TaskStatus> = {
      pendiente: 'pendiente',
      pending: 'pendiente',
      'en progreso': 'en progreso',
      'in progress': 'en progreso',
      in_progress: 'en progreso',
      'en revision': 'en revision',
      'en revisión': 'en revision',
      'in review': 'en revision',
      in_review: 'en revision',
      completada: 'completada',
      completed: 'completada',
    };

    const mapped = aliases[normalized];
    if (mapped) return mapped;

    throw new BadRequestError('Estado no valido');
  }

  private ensureValidStatusTransition(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
    allowedTransitions: Record<TaskStatus, TaskStatus[]>
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestError(`Transicion de estado no permitida: ${currentStatus} -> ${nextStatus}`);
    }
  }
}
