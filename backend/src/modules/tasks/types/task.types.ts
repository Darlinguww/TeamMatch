export const TASK_STATUSES = ['pendiente', 'en progreso', 'en revision', 'completada'] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  assignedUserId: string | null;
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedUserId?: string | null;
}

export interface Task {
  taskId: string;
  title: string;
  description: string;
  createdAt: string;
  status: TaskStatus;
  version: number;
  assignedUserId: string | null;
  assignedUserEmail: string | null;
}

export interface UpdateTaskStatusOptimisticInput {
  projectId: string;
  taskId: string;
  expectedStatus: TaskStatus;
  expectedVersion: number;
  newStatus: TaskStatus;
}

export type UpdateTaskStatusOptimisticResult =
  | { conflict: true }
  | { conflict: false; projectId: string; task: Task };

export interface TaskStatusUpdatedEvent {
  projectId: string;
  task: Task;
  updatedBy: string;
}

export interface TaskReview {
  userId: string;
  taskId: string;
  score: number;
  feedback: string;
  createdAt: string;
}
