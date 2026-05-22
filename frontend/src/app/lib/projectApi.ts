import { ApiError, apiRequest, getStoredToken } from './apiClient';
import type { Project, Task, TaskStatus } from './mockData';
import { computeProjectTaskProgress, type ProjectTaskProgress } from './projectProgress';
import { apiTaskStatusToUi, uiTaskStatusToApiCrud, uiTaskStatusToWorkflowPatch } from './taskStatus';
import { resolveProjectCategories } from './projectCategories';

export function isApiModeEnabled(): boolean {
  return import.meta.env.VITE_USE_API_AUTH === 'true' && Boolean(getStoredToken());
}

/** True when API auth is configured and the route id looks like a backend UUID (not mock ids like p1). */
export function isApiProjectRouteId(routeId: string | undefined): boolean {
  if (!routeId?.trim()) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeId.trim());
}

export function shouldLoadProjectFromApi(routeId: string | undefined): boolean {
  if (import.meta.env.VITE_USE_API_AUTH !== 'true') return false;
  return Boolean(getStoredToken()) || isApiProjectRouteId(routeId);
}

function normalizeApiProject(payload: ApiProjectDetails & { projectId?: string }): ApiProjectDetails {
  const id = payload.id ?? payload.projectId;
  if (!id) {
    throw new ApiError('La respuesta del proyecto no incluye un identificador válido', 502);
  }
  return { ...payload, id: String(id) };
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

export interface ApiProjectKanbanState {
  sprintActive: boolean;
  currentSprint: number;
}

export interface ApiProjectDetails {
  id: string;
  title: string;
  summary: string;
  description?: string;
  createdAt: string;
  categories?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedDuration?: number;
  leader: { userId: string | null; email: string | null } | null;
  roles: ApiProjectRole[];
  kanban?: ApiProjectKanbanState;
  memberCount?: number;
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
  rol?: string | null;
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
  const categories = resolveProjectCategories(
    api.categories,
    api.title,
    api.description || api.summary,
    fallback?.categories ?? (fallback?.category ? [fallback.category] : undefined)
  );
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
        name: r.role,
        description:
          r.headcount && r.headcount > 1 ? `${r.headcount} vacantes` : '',
        requiredSkills: r.skills,
        headcount: r.headcount ?? 1,
      })),
    teamSize:
      fallback?.teamSize ??
      Math.max(
        roles.reduce((sum, r) => sum + (r.headcount ?? 1), 0) + 1,
        3
      ),
    currentTeamSize:
      fallback?.currentTeamSize ??
      (typeof api.memberCount === 'number' && api.memberCount > 0 ? api.memberCount : 1),
    startDate: fallback?.startDate ?? api.createdAt.split('T')[0],
    estimatedDuration: fallback?.estimatedDuration ?? api.estimatedDuration ?? 4,
    categories,
    category: categories[0] ?? 'General',
    difficulty: fallback?.difficulty ?? api.difficulty ?? 'medium',
  };
}

/** Neo4j puede devolver la misma tarea dos veces (CONTIENE + TIENE_TAREA). */
export function dedupeApiTasksById(tasks: ApiTask[]): ApiTask[] {
  const byId = new Map<string, ApiTask>();
  for (const task of tasks) {
    const id = task.taskId?.trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, task);
  }
  return [...byId.values()];
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
  getOpenRecommendations: () =>
    resourceRequest<{
      recommendations: Array<{ projectId: string; title: string; score: number }>;
    }>('/projects/open/recommendations'),
  getProjectMatches: (projectId: string, limit = 30, offset = 0) =>
    resourceRequest<{
      projectId: string;
      matches: ApiMatchmakingResult[];
      pagination: { limit: number; offset: number; total: number };
    }>(`/projects/${projectId}/match?limit=${limit}&offset=${offset}`),
};

export const projectsApi = {
  list: async () => {
    const { projects } = await resourceRequest<{ projects: Array<ApiProjectDetails & { projectId?: string }> }>(
      '/projects'
    );
    return { projects: projects.map(normalizeApiProject) };
  },
  listOpenProjects: async () => {
    const { projects } = await resourceRequest<{ projects: Array<ApiProjectDetails & { projectId?: string }> }>(
      '/projects/open'
    );
    return { projects: projects.map(normalizeApiProject) };
  },
  getParticipationStatus: (projectId: string) =>
    resourceRequest<{
      isMember: boolean;
      pendingJoin: boolean;
      pendingRoles: string[];
      projectId?: string;
    }>(`/projects/${encodeURIComponent(projectId.trim())}/participation-status`),
  requestJoin: (projectId: string, message?: string) =>
    resourceRequest<{
      request: ParticipationRequestPayload;
      message?: string;
    }>(`/projects/${encodeURIComponent(projectId.trim())}/join-requests`, {
      method: 'POST',
      body: JSON.stringify({ message: message ?? null }),
    }),
  applyToRole: (projectId: string, roleName: string, message?: string) =>
    resourceRequest<{ request: ParticipationRequestPayload }>(
      `/projects/${encodeURIComponent(projectId.trim())}/role-applications`,
      {
        method: 'POST',
        body: JSON.stringify({ roleName, message: message ?? null }),
      }
    ),
  create: (body: {
    title: string;
    description?: string;
    roles: ApiProjectRole[];
    categories?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    estimatedDuration?: number;
  }) =>
    resourceRequest<{ projectId: string; project?: ApiProjectDetails }>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  get: async (projectId: string) => {
    const normalizedId = encodeURIComponent(projectId.trim());
    const payload = await resourceRequest<ApiProjectDetails & { projectId?: string }>(
      `/projects/${normalizedId}`
    );
    return normalizeApiProject(payload);
  },
  update: async (
    projectId: string,
    body: {
      title?: string;
      description?: string;
      roles?: ApiProjectRole[];
      categories?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
      estimatedDuration?: number;
    }
  ) => {
    const normalizedId = encodeURIComponent(projectId.trim());
    const payload = await resourceRequest<{ projectId: string; project?: ApiProjectDetails & { projectId?: string } }>(
      `/projects/${normalizedId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );
    if (payload.project) {
      return { projectId: payload.projectId, project: normalizeApiProject(payload.project) };
    }
    return { projectId: payload.projectId };
  },
  listTasks: async (projectId: string): Promise<ApiTask[]> => {
    const normalizedId = encodeURIComponent(projectId.trim());
    const payload = await resourceRequest<ApiTask[] | { tasks?: ApiTask[] }>(
      `/projects/${normalizedId}/tasks`
    );
    const raw = Array.isArray(payload) ? payload : Array.isArray(payload.tasks) ? payload.tasks : [];
    return dedupeApiTasksById(raw);
  },
  updateKanbanState: (
    projectId: string,
    body: { sprintActive: boolean; currentSprint: number }
  ) =>
    resourceRequest<{ kanban: ApiProjectKanbanState }>(
      `/projects/${encodeURIComponent(projectId.trim())}/kanban-state`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    ),
  createTask: (
    projectId: string,
    body: { title: string; description?: string; assignedUserId?: string | null; sprint?: number }
  ) =>
    resourceRequest<ApiTask>(`/projects/${encodeURIComponent(projectId.trim())}/tasks`, {
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
      sprint?: number;
    }
  ) =>
    resourceRequest<ApiTask>(`/tasks/${encodeURIComponent(taskId.trim())}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  updateStatus: (taskId: string, uiStatus: TaskStatus) =>
    resourceRequest<{ task: { taskId: string; status: string } }>(
      `/tasks/${encodeURIComponent(taskId.trim())}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: uiTaskStatusToWorkflowPatch(uiStatus) }),
      }
    ),
  review: (taskId: string, decision: 'approved' | 'rejected', comment?: string) =>
    resourceRequest<{ task: { taskId: string; status: string } }>(
      `/tasks/${encodeURIComponent(taskId.trim())}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ decision, comment: comment ?? null }),
      }
    ),
  delete: (taskId: string) =>
    resourceRequest<{ message: string }>(`/tasks/${taskId}`, { method: 'DELETE' }),
};

export const teamsApi = {
  getComposition: async (projectId: string): Promise<ApiTeamComposition> => {
    const normalizedId = encodeURIComponent(projectId.trim());
    const payload = await resourceRequest<{ team: ApiTeamComposition }>(`/teams/${normalizedId}`);
    const team = payload.team;
    if (!team?.id) {
      throw new ApiError('La respuesta del equipo no incluye datos válidos', 502);
    }
    return team;
  },
  updateMembers: (
    projectId: string,
    body: { add?: Array<{ userId: string; rol: string }>; remove?: string[] }
  ) =>
    resourceRequest<{ projectId: string; added: string[]; removed: string[] }>(
      `/teams/${encodeURIComponent(projectId.trim())}/members`,
      {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

export interface ParticipationRequestPayload {
  requestId: string;
  kind: 'JOIN_PROJECT' | 'ROLE_APPLICATION';
  status: 'pending' | 'approved' | 'rejected';
  projectId: string;
  applicantUserId: string;
  applicantDisplayName: string;
  roleName: string | null;
  message: string | null;
  createdAt: string;
}

export interface UserNotification {
  notificationId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  projectId?: string;
  requestId?: string;
  applicantUserId?: string;
  applicantDisplayName?: string;
  roleName?: string | null;
  actionable?: boolean;
}

export const notificationsApi = {
  list: () => apiRequest<{ notifications: UserNotification[] }>('/notifications'),
  markAsRead: (notificationId: string) =>
    apiRequest<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),
  respond: (notificationId: string, decision: 'approved' | 'rejected') =>
    apiRequest<{ requestId: string; status: string }>(
      `/notifications/${encodeURIComponent(notificationId)}/respond`,
      {
        method: 'POST',
        body: { decision },
      }
    ),
};

export type { ProjectTaskProgress };

/** Loads each project's tasks and derives completion % + tasks assigned to the user. */
export async function loadDashboardProjectData(
  apiProjects: ApiProjectDetails[],
  userId: string
): Promise<{
  projects: Project[];
  progressByProject: Record<string, ProjectTaskProgress>;
  myTasks: Task[];
}> {
  const projects = apiProjects.map((apiProject) => mapApiProjectToUi(apiProject));
  const progressByProject: Record<string, ProjectTaskProgress> = {};
  const myTasks: Task[] = [];

  await Promise.all(
    projects.map(async (project) => {
      try {
        const tasks = await projectsApi.listTasks(project.id);
        progressByProject[project.id] = computeProjectTaskProgress(tasks);
        for (const apiTask of tasks) {
          const uiTask = mapApiTaskToUi(apiTask, project.id);
          if (uiTask.assignedTo === userId) {
            myTasks.push(uiTask);
          }
        }
      } catch {
        progressByProject[project.id] = { completed: 0, total: 0, percent: 0 };
      }
    })
  );

  return { projects, progressByProject, myTasks };
}

export { uiTaskStatusToApiCrud, uiTaskStatusToWorkflowPatch };
