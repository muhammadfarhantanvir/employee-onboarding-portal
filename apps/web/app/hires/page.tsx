'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';
import { apiFetch } from '@/lib/use-api';
import { createClient } from '@/utils/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Types ──────────────────────────────────────────────────────

type HireStatus = 'pending_invite' | 'in_progress' | 'at_risk' | 'completed' | 'cancelled';

interface PhaseProgress {
  total: number;
  completed: number;
}

interface ActiveHireRow {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  startDate: string;
  status: HireStatus;
  completionPct: number;
  daysActive: number;
  daysRemaining: number | null;
  overdueTaskCount: number;
  pendingTaskCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
  managerId: string | null;
  phaseProgress: Record<string, PhaseProgress>;
}

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

interface OverdueTask {
  taskId: string;
  taskTitle: string;
  hireId: string;
  hireFullName: string;
  hireDepartment: string | null;
  phase: string;
  assignedRole: string;
  dueDate: string;
  daysOverdue: number;
}

interface PendingDocument {
  documentId: string;
  documentName: string;
  category: string;
  hireId: string | null;
  hireFullName: string | null;
  uploadedAt: string;
  daysWaiting: number;
  isCompanyDoc: boolean;
}

// ── Status styles ──────────────────────────────────────────────

const STATUS_STYLES: Record<HireStatus, string> = {
  pending_invite: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  at_risk: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<HireStatus, string> = {
  pending_invite: 'Pending Invite',
  in_progress: 'In Progress',
  at_risk: '⚠ At Risk',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PHASE_LABELS: Record<string, string> = {
  pre_boarding: 'Pre-boarding',
  week_1: 'Week 1',
  month_1: 'Month 1',
  month_3: 'Month 3',
};

// ── Sub-components ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  pulse,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${pulse ? 'border-red-300' : 'border-gray-200'}`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-semibold text-gray-800 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: HireStatus }) {
  const color =
    status === 'at_risk'
      ? 'bg-red-500'
      : status === 'completed'
      ? 'bg-green-500'
      : 'bg-indigo-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function HiresPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hires, setHires] = useState<ActiveHireRow[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [docQueue, setDocQueue] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'hires' | 'overdue' | 'documents'>('hires');
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [ov, ah, ot, dq] = await Promise.all([
        apiFetch<Overview>('/analytics/overview'),
        apiFetch<{ hires: ActiveHireRow[] }>('/analytics/active-hires'),
        apiFetch<{ tasks: OverdueTask[] }>('/analytics/overdue-tasks'),
        apiFetch<{ documents: PendingDocument[] }>('/analytics/document-review-queue'),
      ]);
      setOverview(ov);
      setHires(ah.hires);
      setOverdueTasks(ot.tasks);
      setDocQueue(dq.documents);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Supabase Realtime subscription ────────────────────────────

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    // Only attempt Realtime if Supabase URL is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('your-project')) return;

    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel('hr-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hires' }, () => { void loadAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hire_tasks' }, () => { void loadAll(); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, () => { void loadAll(); })
        .subscribe((status) => {
          setRealtimeConnected(status === 'SUBSCRIBED');
        });

      channelRef.current = channel;
    } catch {
      // Supabase not configured — silently skip Realtime
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [loadAll]);

  // ── Filtered hires ─────────────────────────────────────────────

  const filteredHires = statusFilter
    ? hires.filter((h) => h.status === statusFilter)
    : hires;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time onboarding progress across all active hires
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Realtime indicator */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
                aria-hidden="true"
              />
              {realtimeConnected ? 'Live' : 'Polling'}
            </div>
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={() => { setLoading(true); void loadAll(); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none"
              aria-label="Refresh dashboard"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Active Hires"
              value={overview.activeHires}
              sub="in progress or at risk"
              color="text-indigo-600"
            />
            <KpiCard
              label="At Risk"
              value={overview.atRiskHires}
              sub="overdue required tasks"
              color={overview.atRiskHires > 0 ? 'text-red-600' : 'text-gray-700'}
              pulse={overview.atRiskHires > 0}
            />
            <KpiCard
              label="Pending Documents"
              value={overview.pendingDocuments}
              sub="awaiting HR review"
              color={overview.pendingDocuments > 0 ? 'text-yellow-600' : 'text-gray-700'}
            />
            <KpiCard
              label="Completion Rate"
              value={`${overview.completionRate}%`}
              sub={`avg ${overview.avgCompletionPct}% across active`}
              color="text-green-600"
            />
          </div>
        )}

        {/* Secondary KPIs */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Pending Invites', value: overview.pendingInvites, color: 'text-yellow-600' },
              { label: 'Completed This Month', value: overview.completedThisMonth, color: 'text-green-600' },
              { label: 'Overdue Tasks', value: overview.overdueTaskCount, color: overview.overdueTaskCount > 0 ? 'text-red-600' : 'text-gray-600' },
              { label: 'Avg Completion', value: `${overview.avgCompletionPct}%`, color: 'text-indigo-600' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { key: 'hires', label: `Active Hires (${hires.length})`, alert: false },
            { key: 'overdue', label: `Overdue Tasks (${overdueTasks.length})`, alert: overdueTasks.length > 0 },
            { key: 'documents', label: `Doc Review (${docQueue.length})`, alert: docQueue.length > 0 },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* ── Active Hires Table ── */}
            {activeTab === 'hires' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Filter bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500 font-medium">Filter:</span>
                  {(['', 'at_risk', 'in_progress', 'pending_invite', 'completed'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {s === '' ? 'All' : STATUS_LABELS[s as HireStatus]}
                    </button>
                  ))}
                </div>

                {filteredHires.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No hires match this filter</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Hire</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[140px]">Progress</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Days Active</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Tasks</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Phases</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredHires.map((hire) => (
                          <tr
                            key={hire.id}
                            className={`transition-colors ${
                              hire.status === 'at_risk'
                                ? 'bg-red-50/40 hover:bg-red-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{hire.fullName}</p>
                              <p className="text-xs text-gray-400">{hire.email}</p>
                              {hire.jobTitle && (
                                <p className="text-xs text-gray-500">{hire.jobTitle}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {hire.department ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                              {hire.startDate}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[hire.status]}`}>
                                {STATUS_LABELS[hire.status]}
                              </span>
                              {hire.overdueTaskCount > 0 && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  {hire.overdueTaskCount} overdue
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <ProgressBar pct={hire.completionPct} status={hire.status} />
                              {hire.daysRemaining !== null && (
                                <p className={`text-xs mt-0.5 ${hire.daysRemaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {hire.daysRemaining < 0
                                    ? `${Math.abs(hire.daysRemaining)}d overdue`
                                    : `${hire.daysRemaining}d left`}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {hire.daysActive >= 0 ? `Day ${hire.daysActive}` : `In ${Math.abs(hire.daysActive)}d`}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              <span className="text-green-600 font-medium">{hire.completedTaskCount}</span>
                              <span className="text-gray-400">/{hire.totalTaskCount}</span>
                              {hire.pendingTaskCount > 0 && (
                                <span className="text-gray-400 ml-1">({hire.pendingTaskCount} pending)</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {(['pre_boarding', 'week_1', 'month_1', 'month_3'] as const).map((phase) => {
                                  const p = hire.phaseProgress[phase];
                                  if (!p || p.total === 0) return null;
                                  const done = p.completed === p.total;
                                  return (
                                    <div
                                      key={phase}
                                      title={`${PHASE_LABELS[phase]}: ${p.completed}/${p.total}`}
                                      className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`}
                                      aria-label={`${PHASE_LABELS[phase]}: ${p.completed}/${p.total} tasks`}
                                    />
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Overdue Tasks ── */}
            {activeTab === 'overdue' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {overdueTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-gray-600 font-medium">No overdue tasks</p>
                    <p className="text-sm text-gray-400 mt-1">All required tasks are on track</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Task</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Hire</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Phase</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overdueTasks.map((task) => (
                        <tr key={task.taskId} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{task.taskTitle}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900">{task.hireFullName}</p>
                            {task.hireDepartment && (
                              <p className="text-xs text-gray-400">{task.hireDepartment}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {PHASE_LABELS[task.phase] ?? task.phase}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs capitalize">
                            {task.assignedRole.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-red-600 text-xs font-medium">
                            {task.dueDate}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              {task.daysOverdue}d overdue
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Document Review Queue ── */}
            {activeTab === 'documents' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {docQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-gray-600 font-medium">Review queue is empty</p>
                    <p className="text-sm text-gray-400 mt-1">No documents awaiting review</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Hire</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Waiting</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {docQueue.map((doc) => (
                        <tr key={doc.documentId} className="hover:bg-yellow-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true">📄</span>
                              <span className="font-medium text-gray-900">{doc.documentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs capitalize">
                            {doc.category.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {doc.hireFullName ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              doc.daysWaiting > 2
                                ? 'bg-red-100 text-red-700'
                                : doc.daysWaiting > 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {doc.daysWaiting === 0 ? 'Today' : `${doc.daysWaiting}d`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {doc.isCompanyDoc ? 'Company doc' : 'Hire upload'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* Realtime notice */}
        <div className={`mt-6 rounded-xl border p-3 flex items-center gap-3 ${
          realtimeConnected
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
            aria-hidden="true"
          />
          <p className="text-xs text-gray-600">
            {realtimeConnected
              ? 'Supabase Realtime connected — progress bars update instantly when hires complete tasks.'
              : 'Realtime not connected (API uses in-memory store). Data refreshes on page load.'}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
