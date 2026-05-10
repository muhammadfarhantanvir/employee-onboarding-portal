'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Admin',
  manager: 'Manager',
  it_admin: 'IT Admin',
  new_hire: 'New Hire',
  viewer: 'Viewer',
};

const STAT_CARDS = [
  { label: 'Active Hires', value: '2', change: '+1 this week', color: 'bg-indigo-500' },
  { label: 'Tasks Completed', value: '3', change: 'of 6 total', color: 'bg-green-500' },
  { label: 'Pending Documents', value: '1', change: 'awaiting review', color: 'bg-yellow-500' },
  { label: 'At Risk', value: '0', change: 'all on track', color: 'bg-red-500' },
];

const QUICK_LINKS = [
  { href: '/templates', label: 'Manage Templates', desc: 'Create and edit onboarding plans', icon: '📋', roles: ['hr_admin'] },
  { href: '/hires', label: 'View All Hires', desc: 'Track onboarding progress', icon: '👥', roles: ['hr_admin', 'manager', 'viewer'] },
  { href: '/tasks', label: 'My Tasks', desc: 'See your assigned tasks', icon: '✅', roles: ['new_hire', 'it_admin', 'manager'] },
  { href: '/documents', label: 'Document Vault', desc: 'Upload and review documents', icon: '📄', roles: ['hr_admin', 'new_hire', 'manager'] },
  { href: '/it-checklists', label: 'IT Checklists', desc: 'Provision new hire equipment', icon: '💻', roles: ['hr_admin', 'it_admin'] },
  { href: '/notifications', label: 'Notifications', desc: 'View alerts and reminders', icon: '🔔', roles: ['hr_admin', 'manager', 'it_admin', 'new_hire'] },
];

export default function DashboardPage() {
  const { session } = useAuth();
  const role = session?.userRole ?? '';

  const visibleLinks = QUICK_LINKS.filter(
    (l) => !l.roles || l.roles.includes(role),
  );

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.userFullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ROLE_LABELS[role] ?? role} · {session?.companySlug}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <div className="w-5 h-5 bg-white/30 rounded" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.change}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
            >
              <div className="text-2xl mb-3">{link.icon}</div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {link.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </a>
          ))}
        </div>

        {/* Demo notice */}
        <div className="mt-8 rounded-xl bg-indigo-50 border border-indigo-200 p-4">
          <p className="text-sm font-medium text-indigo-800 mb-1">Demo mode — in-memory data</p>
          <p className="text-xs text-indigo-600">
            All data is stored in RAM and resets when the API restarts. The SQL migrations in{' '}
            <code className="bg-indigo-100 px-1 rounded">apps/api/supabase/migrations/</code> are ready
            to run against a real Supabase/PostgreSQL instance.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
