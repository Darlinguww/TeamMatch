import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import {
  CreateTaskInput,
  TASK_STATUSES,
  Task,
  TaskReview,
  TaskStatus,
  UpdateTaskInput,
  UpdateTaskStatusOptimisticInput,
  UpdateTaskStatusOptimisticResult,
} from './types/task.types.js';

const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pendiente: ['en progreso'],
  'en progreso': ['en revision'],
  'en revision': ['en progreso', 'completada'],
  completada: []
};

export interface TaskRepository {
  isUserInProject(userId: string, projectId: string): Promise<boolean>;
  isUserInProjectByTask(userId: string, taskId: string): Promise<boolean>;
  isTaskInProject(taskId: string): Promise<boolean>;
  createTask(input: CreateTaskInput): Promise<Task>;
  listProjectTasks(projectId: string, status?: TaskStatus): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  updateTask(input: UpdateTaskInput): Promise<Task | null>;
  getTaskProjectId(taskId: string): Promise<string | null>;
  updateTaskStatusOptimistic(
    input: UpdateTaskStatusOptimisticInput,
  ): Promise<UpdateTaskStatusOptimisticResult>;
  deleteTask(taskId: string): Promise<boolean>;
  createReview(taskId: string, reviewerId: string, rating: number, comment: string): Promise<TaskReview | null>;
}

export class TaskService {
  public constructor(private readonly repository: TaskRepository) {}

  public async createProjectTask(
    userId: string,
    projectId: string,
    input: { title?: unknown; description?: unknown; userAsigned?: unknown; assignedUserId?: unknown }
  ): Promise<Task> {
    const title = this.parseTitle(input.title);
    const description = this.parseOptionalText(input.description);
    const assignedUserId = this.parseOptionalUserId(input.assignedUserId ?? input.userAsigned);

    await this.ensureProjectAccess(userId, projectId);

    if (assignedUserId) {
      await this.ensureProjectAccess(assignedUserId, projectId);
    }

    return this.repository.createTask({
      projectId,
      title,
      description,
      assignedUserId
    });
  }

  public async listProjectTasks(userId: string, projectId: string, rawStatus?: unknown): Promise<Task[]> {
    await this.ensureProjectAccess(userId, projectId);
    const status = rawStatus === undefined ? undefined : this.parseStatus(rawStatus);
    return this.repository.listProjectTasks(projectId, status);
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
    input: { title?: unknown; description?: unknown; status?: unknown; userAsigned?: unknown; assignedUserId?: unknown }
  ): Promise<Task> {
    await this.ensureTaskAccess(userId, taskId);
    const currentTask = await this.repository.getTask(taskId);

    if (!currentTask) {
      throw new NotFoundError('Tarea no encontrada');
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
      this.ensureValidStatusTransition(currentTask.status, patch.status);
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

    const updatedTask = await this.repository.updateTask(patch);
    if (!updatedTask) {
      throw new NotFoundError('Tarea no encontrada');
    }

    return updatedTask;
  }

  public async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.ensureTaskAccess(userId, taskId);
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

  /** Usado por Socket.io al unirse a la room del proyecto. */
  public async ensureProjectAccessForSocket(userId: string, projectId: string): Promise<void> {
    await this.ensureProjectAccess(userId, projectId);
  }

  /**
   * Actualiza estado con control optimista (SCRUM-202).
   * Lanza ConflictError (409) si otro usuario modificó la tarea primero.
   */
  public async updateTaskStatusViaSocket(
    userId: string,
    input: {
      projectId: string;
      taskId: string;
      expectedStatus: string;
      expectedVersion: number;
      newStatus: string;
    },
  ): Promise<Task> {
    await this.ensureProjectAccess(userId, input.projectId);
    await this.ensureTaskAccess(userId, input.taskId);

    const taskProjectId = await this.repository.getTaskProjectId(input.taskId);
    if (taskProjectId !== input.projectId) {
      throw new NotFoundError('Tarea no pertenece al proyecto');
    }

    const expectedStatus = this.parseStatus(input.expectedStatus);
    const newStatus = this.parseStatus(input.newStatus);
    this.ensureValidStatusTransition(expectedStatus, newStatus);

    const result = await this.repository.updateTaskStatusOptimistic({
      projectId: input.projectId,
      taskId: input.taskId,
      expectedStatus,
      expectedVersion: input.expectedVersion,
      newStatus,
    });

    if (result.conflict) {
      throw new ConflictError(
        'La tarea fue modificada por otro usuario. Recarga el tablero e intenta de nuevo.',
        { taskId: input.taskId },
      );
    }

    return result.task;
  }

  private async ensureProjectAccess(userId: string, projectId: string): Promise<void> {
    const hasAccess = await this.repository.isUserInProject(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenError('Forbidden');
    }
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
    if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
      throw new BadRequestError('Estado no valido');
    }

    return value as TaskStatus;
  }

  private ensureValidStatusTransition(currentStatus: TaskStatus, nextStatus: TaskStatus): void {
    if (currentStatus === nextStatus) {
      return;
    }

    if (!ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new BadRequestError(`Transicion de estado no permitida: ${currentStatus} -> ${nextStatus}`);
    }
  }
}
