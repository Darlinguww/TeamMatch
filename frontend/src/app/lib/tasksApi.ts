import { apiFetch } from './apiClient';
import type { ApiTask } from './taskStatusMap';

export async function fetchProjectTasks(projectId: string): Promise<ApiTask[]> {
  return apiFetch<ApiTask[]>(`/projects/${encodeURIComponent(projectId)}/tasks`);
}
