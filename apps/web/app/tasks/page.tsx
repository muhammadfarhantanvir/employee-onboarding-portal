'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

interface Task {
  id: string;
  title: string;
  description: string | null;
  taskType: string;
  phase: string;
  status: TaskStatus;
  dueDate: string | null;
  isRequired: boolean;
  hireId: string;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
  blocked: 'bg-red-100 text-red-700',
};

const PHASE_LABELS: Record<string, string> = {
  pre_boarding: 'Pre-boarding',
  week_1: 'Week 1',
  month_1: 'Month 1',
  month_3: 'Month 3',
};

const TYPE_ICONS: Record<string, string> = {
  checkbox: '✓',
  document_upload: '📄',
  form_submission: '📝',
  acknowledgement: '👁',
  meeting: '📅',
};

async function fetchMyTasks(): Promise<Task[]> {
  const session = getSession();
  if (!session) return [];
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
  if (!res.ok) throw new Error('Failed to load tasks');
  const data = await res.json();
  return data.tasks ?? [];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Your assigned onboarding tasks across all hires</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-medium text-gray-900">All caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No pending tasks assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue = task.dueDate && task.dueDate < today && task.status === 'pending';
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-4 shadow-sm ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5" aria-hidden="true">
                      {TYPE_ICONS[task.taskType] ?? '•'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {!task.isRequired && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Optional</span>
                        )}
                        {isOverdue && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Overdue</span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span>{PHASE_LABELS[task.phase] ?? task.phase}</span>
                        {task.dueDate && (
                          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                            Due {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
