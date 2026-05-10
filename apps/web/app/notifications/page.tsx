'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  hire_invited: '👋',
  hire_completed: '🎉',
  hire_at_risk: '⚠️',
  task_assigned: '📋',
  task_due_soon: '⏰',
  task_overdue: '🔴',
  task_completed: '✅',
  task_blocked: '🚫',
  doc_uploaded: '📄',
  doc_approved: '✅',
  doc_rejected: '❌',
  approval_needed: '👍',
  checkin_30_day: '📅',
  checkin_90_day: '📅',
  it_provisioning_needed: '💻',
  reminder_sent: '🔔',
};

async function fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const session = getSession();
  if (!session) return { notifications: [], unreadCount: 0 };
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

async function markAllRead(): Promise<void> {
  const session = getSession();
  if (!session) return;
  await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications()
      .then(({ notifications: n, unreadCount: u }) => {
        setNotifications(n);
        setUnreadCount(u);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Mark all as read
            </button>
          )}
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
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-medium text-gray-900">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 bg-white rounded-xl border p-4 shadow-sm transition-colors ${
                  !n.isRead ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                  {TYPE_ICONS[n.type] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" aria-label="Unread" />
                    )}
                  </div>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
