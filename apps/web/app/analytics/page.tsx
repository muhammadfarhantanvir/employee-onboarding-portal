'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Types ──────────────────────────────────────────────────────

interface Overview {
  activeHires: number;
  atRiskHires: number;
  pendingInvites: number;
  completedThisMonth: number;
  avgCompletionPct: number;
  completionRate: number;
  pendingDocuments: number;
  overdueTaskCount: number;
  refreshedAt: string;
}

interface DeptRow {
  department: string;
  totalHires: number;
  completedHires: number;
  completionRate: number;
  avgCompletionPct: number;
  atRiskCount: number;
}

interface PhaseRow {
  phase: string;
  avgDaysToComplete: number | null;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
}

interface CohortPoint {
  month: string;
  invited: number;
  completed: number;
  atRisk: number;
}

// ── Helpers ────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const session = getSession();
  if (!session) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

function downloadCsv(path: string, filename: string) {
  const session = getSession();
  if (!session) return;
  fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  })
    .then((r) => r.text())
    .then((csv) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
}

const PHASE_LABELS: Record<string, string> = {
  pre_boarding: 'Pre-boarding',
  week_1: 'Week 1',
  month_1: 'Month 1',
  month_3: 'Month 3',
};

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const STATUS_PIE_COLORS: Record<string, string> = {
  in_progress: '#6366f1',
  at_risk: '#ef4444',
  pending_invite: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#9ca3af',
};

// ── Sub-components ─────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          <p className="text-sm font-semibold text-gray-800 mt-1">{label}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl" aria-hidden="true">{icon}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [deptData, setDeptData] = useState<DeptRow[]>([]);
  const [phaseData, setPhaseData] = useState<PhaseRow[]>([]);
  const [cohortData, setCohortData] = useState<CohortPoint[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadAll = useCallback(async () => {
    try {
      const [ov, dept, phase, cohort, active] = await Promise.all([
        apiFetch<Overview>('/analytics/overview'),
        apiFetch<DeptRow[]>('/analytics/completion-by-department'),
        apiFetch<PhaseRow[]>('/analytics/phase-time'),
        apiFetch<CohortPoint[]>('/analytics/hire-cohort?months=6'),
        apiFetch<{ byStatus: Record<string, number> }>('/analytics/active-hires'),
      ]);
      setOverview(ov);
      setDeptData(dept);
      setPhaseData(phase);
      setCohortData(cohort);
      setByStatus(active.byStatus);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived chart data ─────────────────────────────────────────

  const phaseChartData = phaseData.map((p) => ({
    name: PHASE_LABELS[p.phase] ?? p.phase,
    Completed: p.completedCount,
    Pending: p.pendingCount,
    Overdue: p.overdueCount,
    'Avg Days': p.avgDaysToComplete ?? 0,
  }));

  const deptChartData = deptData.map((d) => ({
    name: d.department.length > 12 ? d.department.slice(0, 12) + '…' : d.department,
    fullName: d.department,
    'Completion %': d.completionRate,
    'Avg %': d.avgCompletionPct,
    'At Risk': d.atRiskCount,
    Total: d.totalHires,
  }));

  const statusPieData = Object.entries(byStatus)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value,
      color: STATUS_PIE_COLORS[key] ?? '#9ca3af',
    }));

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Onboarding performance — completion rates, phase bottlenecks, cohort trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={() => { setLoading(true); void loadAll(); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ↻ Refresh
            </button>
            {/* Export buttons */}
            <button
              onClick={() => downloadCsv('/analytics/export/hires', `hires-${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Export hires as CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Hires CSV
            </button>
            <button
              onClick={() => downloadCsv('/analytics/export/tasks', `tasks-${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Export tasks as CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tasks CSV
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Active Hires" value={overview.activeHires} sub="in progress or at risk" color="text-indigo-600" icon="👥" />
                <KpiCard label="Completion Rate" value={`${overview.completionRate}%`} sub={`avg ${overview.avgCompletionPct}% active`} color="text-green-600" icon="✅" />
                <KpiCard label="At Risk" value={overview.atRiskHires} sub="overdue required tasks" color={overview.atRiskHires > 0 ? 'text-red-600' : 'text-gray-700'} icon="⚠️" />
                <KpiCard label="Pending Docs" value={overview.pendingDocuments} sub="awaiting HR review" color={overview.pendingDocuments > 0 ? 'text-yellow-600' : 'text-gray-700'} icon="📄" />
              </div>
            )}

            {/* ── Row 1: Cohort Line Chart + Status Pie ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Hire Cohort — Line Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeader
                  title="Monthly Hire Volume"
                  sub="Invited vs completed vs at-risk over the last 6 months"
                />
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cohortData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="invited" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Invited" />
                    <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                    <Line type="monotone" dataKey="atRisk" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="At Risk" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution — Pie Chart */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeader title="Status Distribution" sub="Current hire breakdown" />
                {statusPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, String(n).replace(/_/g, ' ')]} />
                      <Legend
                        formatter={(v) => String(v).replace(/_/g, ' ')}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Row 2: Phase Completion Bar + Avg Days ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Phase Task Counts — Stacked Bar */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeader
                  title="Task Status by Phase"
                  sub="Completed vs pending vs overdue per onboarding phase"
                />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={phaseChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pending" stackId="a" fill="#6366f1" />
                    <Bar dataKey="Overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Avg Days to Complete — Bar */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <SectionHeader
                  title="Average Days to Complete by Phase"
                  sub="How long tasks take from hire start date"
                />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={phaseChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Avg Days" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Row 3: Department Completion ── */}
            {deptChartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
                <SectionHeader
                  title="Completion Rate by Department"
                  sub="Which teams are on track vs struggling"
                />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      formatter={(v, n) => [`${v}%`, n]}
                      labelFormatter={(label) => {
                        const row = deptChartData.find((d) => d.name === label);
                        return row?.fullName ?? label;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Completion %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Avg %" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Row 4: Department Table ── */}
            {deptData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Department Breakdown</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Completion %</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Avg %</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">At Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptData.map((row) => (
                      <tr key={row.department} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.department}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.totalHires}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{row.completedHires}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${row.completionRate}%` }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{row.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.avgCompletionPct}%</td>
                        <td className="px-4 py-3 text-right">
                          {row.atRiskCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              {row.atRiskCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Phase Metrics Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Phase Performance Metrics</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Phase</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Avg Days</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Pending</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {phaseData.map((row) => (
                    <tr key={row.phase} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {PHASE_LABELS[row.phase] ?? row.phase}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {row.avgDaysToComplete !== null ? `${row.avgDaysToComplete}d` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{row.completedCount}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{row.pendingCount}</td>
                      <td className="px-4 py-3 text-right">
                        {row.overdueCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            {row.overdueCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Data Export</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => downloadCsv('/analytics/export/hires', `hires-${new Date().toISOString().slice(0,10)}.csv`)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hires Export</p>
                    <p className="text-xs text-gray-500">All hires with completion % and task counts</p>
                  </div>
                </button>
                <button
                  onClick={() => downloadCsv('/analytics/export/tasks', `tasks-${new Date().toISOString().slice(0,10)}.csv`)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tasks Export</p>
                    <p className="text-xs text-gray-500">All tasks with phase, status, and due dates</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
