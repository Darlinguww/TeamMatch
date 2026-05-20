import { ApiError, getStoredToken } from './apiClient';
import type { Project, Task, TaskStatus } from './mockData';
import { apiTaskStatusToUi, uiTaskStatusToApiCrud, uiTaskStatusToWorkflowPatch } from './taskStatus';

export function isApiModeEnabled(): boolean {
  return import.meta.env.VITE_USE_API_AUTH === 'true' && Boolean(getStoredToken());
}

/** Base URL para rutas `/projects` y `/tasks` (sin prefijo `/api`). */
export function getResourceApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (configured) {
    return configured.replace(/\/api$/i, '') || configured;
  }
  return 'http://localhost:3000';
}

export interface ApiProjectRole {
  role: string;
  skills: string[];
  headcount?: number;
}

export interface ApiProjectDetails {
  id: string;
  title: string;
  summary: string;
  description?: string;
  createdAt: string;
  leader: { userId: string | null; email: string | null } | null;
  roles: ApiProjectRole[];
}

export interface ApiTask {
  taskId: string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
  assignedUserId: string | null;
  assignedUserEmail: string | null;
  sprint?: number | null;
}

export interface ApiTeamMember {
  userId: string;
  user: string;
  joinedAt: string | null;
}

export interface ApiTeamComposition {
  id: string;
  title: string;
  members: ApiTeamMember[];
}

async function resourceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getResourceApiBase()}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message ?? response.statusText;
    const code = payload?.error?.code;
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

export function mapApiProjectToUi(api: ApiProjectDetails, fallback?: Project): Project {
  const leaderId = api.leader?.userId ?? fallback?.leaderId ?? '';
  const roles = Array.isArray(api.roles) ? api.roles : [];
  return {
    id: api.id,
    name: api.title,
    description: api.description || api.summary,
    status: fallback?.status ?? 'open',
    leaderId,
    requiredSkills:
      fallback?.requiredSkills ??
      roles.flatMap((r) =>
        r.skills.map((skill, idx) => ({
          id: `sk_${api.id}_${idx}`,
          name: skill,
          category: 'technical' as const,
          level: 'intermediate' as const,
        }))
      ),
    requiredRoles:
      fallback?.requiredRoles ??
      roles.map((r, idx) => ({
        id: `role_${api.id}_${idx}`,
        name: r.headcount && r.headcount > 1 ? `${r.role} (×${r.headcount})` : r.role,
        description: r.headcount && r.headcount > 1 ? `${r.headcount} vacantes` : '',
        requiredSkills: r.skills,
      })),
    teamSize:
      fallback?.teamSize ??
      Math.max(
        roles.reduce((sum, r) => sum + (r.headcount ?? 1), 0) + 1,
        3
      ),
    currentTeamSize: fallback?.currentTeamSize ?? 1,
    startDate: fallback?.startDate ?? api.createdAt.split('T')[0],
    estimatedDuration: fallback?.estimatedDuration ?? 4,
    category: fallback?.category ?? 'Web Platform',
    difficulty: fallback?.difficulty ?? 'medium',
  };
}

export function mapApiTaskToUi(api: ApiTask, projectId: string): Task {
  const due = new Date(api.createdAt);
  due.setDate(due.getDate() + 7);
  return {
    id: api.taskId,
    projectId,
    title: api.title,
    description: api.description ?? '',
    assignedTo: api.assignedUserId ?? '',
    status: apiTaskStatusToUi(api.status),
    priority: 'medium',
    dueDate: due.toISOString().split('T')[0],
    createdDate: api.createdAt,
    sprint: api.sprint ?? 1,
  };
}

export interface ApiMatchmakingResult {
  userId: string;
  user: string;
  score: number;
  breakdown: {
    skills: number;
    availability: number;
    reputation: number;
    roleCoverage: number;
    categoryDomain: number;
    redundancyPenalty: number;
    experienceBalance: number;
  };
  coverage: {
    coveredRequiredSkills: string[];
    missingRequiredSkills: string[];
    coveredRoles: string[];
    totalRequiredSkills: number;
  };
  reasons: string[];
  experienceLevel: string;
  reputationScore: number;
}

export const matchmakingApi = {
  getProjectMatches: (projectId: string, limit = 30, offset = 0) =>
    resourceRequest<{
      projectId: string;
      matches: ApiMatchmakingResult[];
      pagination: { limit: number; offset: number; total: number };
    }>(`/projects/${projectId}/match?limit=${limit}&offset=${offset}`),
};

export const projectsApi = {
  list: () => resourceRequest<{ projects: ApiProjectDetails[] }>('/projects'),
  create: (body: { title: string; description?: string; roles: ApiProjectRole[] }) =>
    resourceRequest<{ projectId: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  get: (projectId: string) => resourceRequest<ApiProjectDetails>(`/projects/${projectId}`),
  listTasks: (projectId: string) => resourceRequest<ApiTask[]>(`/projects/${projectId}/tasks`),
  createTask: (
    projectId: string,
    body: { title: string; description?: string; assignedUserId?: string | null; sprint?: number }
  ) =>
    resourceRequest<ApiTask>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const tasksApi = {
  update: (
    taskId: string,
    body: {
      title?: string;
      description?: string;
      status?: string;
      assignedUserId?: string | null;
    }
  ) =>
    resourceRequest<ApiTask>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  updateStatus: (taskId: string, uiStatus: TaskStatus) =>
    resourceRequest<{ task: { taskId: string; status: string } }>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: uiTaskStatusToWorkflowPatch(uiStatus) }),
    }),
  review: (taskId: string, decision: 'approved' | 'rejected', comment?: string) =>
    resourceRequest<{ task: { taskId: string; status: string } }>(`/tasks/${taskId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: comment ?? null }),
    }),
  delete: (taskId: string) =>
    resourceRequest<{ message: string }>(`/tasks/${taskId}`, { method: 'DELETE' }),
};

export const teamsApi = {
  getComposition: (projectId: string) =>
    resourceRequest<ApiTeamComposition>(`/teams/${projectId}`),
};

export { uiTaskStatusToApiCrud, uiTaskStatusToWorkflowPatch };
