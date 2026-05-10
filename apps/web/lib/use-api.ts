'use client';

import { useCallback } from 'react';
import { getSession, clearSession } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/**
 * Returns a typed fetch helper that always reads the session from
 * localStorage at call-time (not at module load time).
 * This avoids the SSR/hydration issue where localStorage is unavailable.
 */
export function useApiFetch() {
  const apiFetch = useCallback(async <T>(
    path: string,
    opts: RequestInit = {},
  ): Promise<T> => {
    const session = getSession();

    if (!session) {
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Company-Slug': session.companySlug,
        ...(opts.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearSession();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      const body = await res.json().catch(() => ({}));
      throw new Error(
        Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message ?? `Request failed: ${res.status}`,
      );
    }

    return res.json() as Promise<T>;
  }, []);

  return apiFetch;
}

/**
 * Standalone fetch helper for use outside React components.
 * Always reads session at call-time.
 */
export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const session = getSession();

  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
      ...(opts.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(body?.message)
        ? body.message.join(', ')
        : body?.message ?? `Request failed: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}
