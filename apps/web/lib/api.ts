import { OnboardingTemplate, TemplateTask } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Auth helpers ───────────────────────────────────────────────

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  companySlug: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  userRole: string;
}

const SESSION_KEY = 'onboarding_session';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// ── Core request ───────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  if (session?.companySlug) {
    headers['X-Company-Slug'] = session.companySlug;
  }

  // Merge caller-provided headers last so they can override
  const merged = { ...headers, ...(options.headers as Record<string, string> ?? {}) };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: merged,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Token expired — clear session so the login page shows
    if (res.status === 401) {
      clearSession();
    }
    throw new Error(
      Array.isArray(body?.message)
        ? body.message.join(', ')
        : body?.message ?? `Request failed: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    companyId: string;
  };
  company: {
    id: string;
    slug: string;
    name: string;
  };
}

export async function login(
  email: string,
  password: string,
  companySlug?: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, companySlug }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? 'Login failed');
  }

  const data = (await res.json()) as LoginResponse;

  saveSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    companySlug: data.company.slug,
    userId: data.user.id,
    userEmail: data.user.email,
    userFullName: data.user.fullName,
    userRole: data.user.role,
  });

  return data;
}

export async function logout(): Promise<void> {
  const session = getSession();
  if (session) {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } catch {
      // Ignore errors on logout — clear locally regardless
    }
  }
  clearSession();
}

// ── Templates ──────────────────────────────────────────────────

export async function listTemplates(): Promise<{
  templates: OnboardingTemplate[];
  count: number;
}> {
  return request('/templates');
}

export async function getTemplate(id: string): Promise<OnboardingTemplate> {
  return request(`/templates/${id}`);
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  department?: string;
}): Promise<OnboardingTemplate> {
  return request('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: { name?: string; description?: string; department?: string },
): Promise<OnboardingTemplate> {
  return request(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  return request(`/templates/${id}`, { method: 'DELETE' });
}

export async function duplicateTemplate(
  id: string,
  data?: { name?: string; department?: string },
): Promise<OnboardingTemplate> {
  return request(`/templates/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

// ── Template Tasks ─────────────────────────────────────────────

export async function addTask(
  templateId: string,
  data: {
    title: string;
    description?: string;
    taskType: string;
    phase: string;
    assignedRole?: string;
    dueDayOffset?: number;
    isRequired?: boolean;
  },
): Promise<TemplateTask> {
  return request(`/templates/${templateId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  templateId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    taskType: string;
    phase: string;
    assignedRole: string;
    dueDayOffset: number;
    isRequired: boolean;
  }>,
): Promise<TemplateTask> {
  return request(`/templates/${templateId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(
  templateId: string,
  taskId: string,
): Promise<{ success: boolean }> {
  return request(`/templates/${templateId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function reorderTasks(
  templateId: string,
  taskIds: string[],
): Promise<OnboardingTemplate> {
  return request(`/templates/${templateId}/tasks/reorder`, {
    method: 'POST',
    body: JSON.stringify({ taskIds }),
  });
}
