'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/use-api';

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Admin',
  manager: 'Manager',
  it_admin: 'IT Admin',
  new_hire: 'New Hire',
  viewer: 'Viewer',
};

const QUICK_LINKS = [
  { href: '/templates', label: 'Manage Templates', desc: 'Create and edit onboarding plans', icon: '📋', roles: ['hr_admin'] },
  { href: '/hires', label: 'HR Dashboard', desc: 'Track onboarding progress in real time', icon: '👥', roles: ['hr_admin', 'manager', 'viewer'] },
  { href: '/tasks', label: 'My Tasks', desc: 'See your assigned tasks', icon: '✅', roles: ['new_hire', 'it_admin', 'manager'] },
  { href: '/documents', label: 'Document Vault', desc: 'Upload and review documents', icon: '📄', roles: ['hr_admin', 'new_hire', 'manager'] },
  { href: '/it-checklists', label: 'IT Checklists', desc: 'Provision new hire equipment', icon: '💻', roles: ['hr_admin', 'it_admin'] },
  { href: '/notifications', label: 'Notifications', desc: 'View alerts and reminders', icon: '🔔', roles: ['hr_admin', 'manager', 'it_admin', 'new_hire'] },
  { href: '/analytics', label: 'Analytics', desc: 'Completion rates and reporting', icon: '📊', roles: ['hr_admin', 'manager', 'viewer'] },
  { href: '/gdpr', label: 'GDPR', desc: 'Data access log and erasure requests', icon: '🔒', roles: ['hr_admin'] },
];

interface Overview {
  activeHires: number;
  atRiskHires: number;
  pendingDocuments: number;
  overdueTaskCount: number;
  completionRate: number;
  avgCompletionPct: number;
}

async function fetchOverview(): Promise<Overview | null> {
  try {
    return await apiFetch<Overview>('/analytics/overview');
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { session } = useAuth();
  const role = session?.userRole ?? '';
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    fetchOverview().then(setOverview);
  }, []);

  const visibleLinks = QUICK_LINKS.filter(
    (l) => !l.roles || l.roles.includes(role),
  );

  const stats = overview
    ? [
        { label: 'Active Hires', value: overview.activeHires, change: `${overview.atRiskHires} at risk`, color: 'bg-indigo-500' },
        { label: 'Completion Rate', value: `${overview.completionRate}%`, change: `avg ${overview.avgCompletionPct}% active`, color: 'bg-green-500' },
        { label: 'Pending Documents', value: overview.pendingDocuments, change: 'awaiting review', color: 'bg-yellow-500' },
        { label: 'Overdue Tasks', value: overview.overdueTaskCount, change: overview.overdueTaskCount === 0 ? 'all on track' : 'need attention', color: overview.overdueTaskCount > 0 ? 'bg-red-500' : 'bg-green-500' },
      ]
    : [
        { label: 'Active Hires', value: '—', change: 'loading…', color: 'bg-indigo-500' },
        { label: 'Completion Rate', value: '—', change: 'loading…', color: 'bg-green-500' },
        { label: 'Pending Documents', value: '—', change: 'loading…', color: 'bg-yellow-500' },
        { label: 'Overdue Tasks', value: '—', change: 'loading…', color: 'bg-red-500' },
      ];

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.userFullName?.split(' ')[0] ?? '…'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ROLE_LABELS[role] ?? role} · {session?.companySlug}
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((card) => (
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
      </div>
    </AppShell>
  );
}
