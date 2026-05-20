import type { Task, TaskStatus } from './mockData';

/** Estados del backend (SCRUM-202 / dominio Neo4j). */
export type ApiTaskStatus = 'pendiente' | 'en progreso' | 'en revision' | 'completada';

export interface ApiTask {
  taskId: string;
  title: string;
  description: string;
  createdAt: string;
  status: ApiTaskStatus;
  version: number;
  assignedUserId: string | null;
  assignedUserEmail: string | null;
}

const API_TO_KANBAN: Record<ApiTaskStatus, TaskStatus> = {
  pendiente: 'pending',
  'en progreso': 'in-progress',
  'en revision': 'blocked',
  completada: 'completed',
};

const KANBAN_TO_API: Record<TaskStatus, ApiTaskStatus> = {
  pending: 'pendiente',
  'in-progress': 'en progreso',
  blocked: 'en revision',
  completed: 'completada',
};

export function apiStatusToKanban(status: string): TaskStatus {
  return API_TO_KANBAN[status as ApiTaskStatus] ?? 'pending';
}

export function kanbanStatusToApi(status: TaskStatus): ApiTaskStatus {
  return KANBAN_TO_API[status];
}

export function apiTaskToKanban(task: ApiTask, projectId: string): Task {
  return {
    id: task.taskId,
    projectId,
    title: task.title,
    description: task.description,
    assignedTo: task.assignedUserId ?? '',
    status: apiStatusToKanban(task.status),
    priority: 'medium',
    dueDate: task.createdAt,
    createdDate: task.createdAt,
    version: task.version,
  };
}
