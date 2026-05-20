import type { TaskStatus } from './mockData';

/** Estados del tablero Kanban (UI). */
export type UiTaskStatus = TaskStatus;

/** Estados del CRUD de tareas en backend (`TaskService`). */
export type ApiCrudTaskStatus = 'pendiente' | 'en progreso' | 'en revision' | 'completada';

const UI_TO_API_CRUD: Record<UiTaskStatus, ApiCrudTaskStatus> = {
  pending: 'pendiente',
  'in-progress': 'en progreso',
  blocked: 'en revision',
  completed: 'completada',
};

const API_CRUD_TO_UI: Record<string, UiTaskStatus> = {
  pendiente: 'pending',
  'en progreso': 'in-progress',
  'en revision': 'blocked',
  'en revisión': 'blocked',
  completada: 'completed',
  // workflow / legacy labels
  'in review': 'blocked',
  in_review: 'blocked',
  approved: 'completed',
  rejected: 'in-progress',
};

export function uiTaskStatusToApiCrud(status: UiTaskStatus): ApiCrudTaskStatus {
  return UI_TO_API_CRUD[status];
}

export function apiTaskStatusToUi(status: string): UiTaskStatus {
  const key = status.trim().toLowerCase();
  if (API_CRUD_TO_UI[key]) return API_CRUD_TO_UI[key];
  const normalized = key.replace(/_/g, ' ');
  if (API_CRUD_TO_UI[normalized]) return API_CRUD_TO_UI[normalized];
  if (normalized.includes('complet')) return 'completed';
  if (normalized.includes('revision') || normalized.includes('review')) return 'blocked';
  if (normalized.includes('progreso') || normalized.includes('progress')) return 'in-progress';
  if (normalized.includes('pendiente') || normalized.includes('pending')) return 'pending';
  return 'pending';
}

/** Etiqueta enviada a `PATCH /tasks/:id/status` (workflow). Usar español canónico del backend. */
export function uiTaskStatusToWorkflowPatch(status: UiTaskStatus): string {
  return uiTaskStatusToApiCrud(status);
}
