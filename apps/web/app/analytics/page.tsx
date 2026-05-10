'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';

const MOCK_STATS = [
  { label: 'Active Hires', value: 2, sub: 'currently onboarding', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Completion Rate', value: '33%', sub: 'avg across active hires', color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'At Risk', value: 0, sub: 'overdue required tasks', color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Pending Docs', value: 1, sub: 'awaiting HR review', color: 'text-yellow-600', bg: 'bg-yellow-50' },
];

const PHASE_DATA = [
  { phase: 'Pre-boarding', completed: 2, total: 3 },
  { phase: 'Week 1', completed: 0, total: 3 },
  { phase: 'Month 1', completed: 0, total: 2 },
  { phase: 'Month 3', completed: 0, total: 1 },
];

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Onboarding performance overview — demo data</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MOCK_STATS.map((stat) => (
            <div key={stat.label} className={`rounded-xl border border-gray-200 p-5 shadow-sm ${stat.bg}`}>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Phase completion */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Task Completion by Phase</h2>
          <div className="space-y-4">
            {PHASE_DATA.map((p) => {
              const pct = p.total === 0 ? 0 : Math.round((p.completed / p.total) * 100);
              return (
                <div key={p.phase}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{p.phase}</span>
                    <span className="text-sm text-gray-500">{p.completed}/{p.total} tasks · {pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Live analytics coming soon</p>
          <p className="text-xs text-blue-600">
            Full analytics with Recharts charts (completion rates, hire cohorts, overdue task heatmaps)
            will be powered by real database queries once connected to Supabase.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
