import { OnboardingTemplate, TemplateTask } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Reads the auth token from localStorage (set after login). */
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') ?? '';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
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
