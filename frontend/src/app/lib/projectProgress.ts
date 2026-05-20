import type { ApiTask } from './projectApi';
import { apiTaskStatusToUi } from './taskStatus';

export interface ProjectTaskProgress {
  completed: number;
  total: number;
  percent: number;
}

/** Project completion from persisted task statuses (Kanban / API). */
export function computeProjectTaskProgress(tasks: ApiTask[]): ProjectTaskProgress {
  const total = tasks.length;
  const completed = tasks.filter((t) => apiTaskStatusToUi(t.status) === 'completed').length;
  return {
    completed,
    total,
    percent: total > 0 ? (completed / total) * 100 : 0,
  };
}
