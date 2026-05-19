const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'teammatch_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore quota */
  }
}

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message ?? response.statusText;
    const code = payload?.error?.code;
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

export const authApi = {
  register: (data: { email: string; password: string; user?: string }) =>
    apiRequest<{ message: string }>('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (data: { email: string; password: string }) =>
    apiRequest<{ token: string }>('/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => apiRequest<{ user: { userId: string; email: string; user: string } }>('/auth/me')
};

export const feedbackApi = {
  submit: (data: { projectId: string; toUserId: string; score: number; comment?: string }) =>
    apiRequest('/feedback', { method: 'POST', body: data }),
  closeProject: (projectId: string) =>
    apiRequest(`/feedback/projects/${projectId}/close`, { method: 'POST', body: {} })
};
