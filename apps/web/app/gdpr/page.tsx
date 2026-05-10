'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Types ──────────────────────────────────────────────────────

interface AccessLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ErasureRequest {
  id: string;
  hireId: string | null;
  requestedBy: string | null;
  reason: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface PrivacyPolicy {
  id: string;
  version: string;
  effectiveAt: string;
  contentUrl: string | null;
  isCurrent: boolean;
  createdAt: string;
}

interface ExpiredDoc {
  id: string;
  name: string;
  category: string;
  retentionUntil: string;
  hireId: string | null;
}

// ── Helpers ────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const session = getSession();
  if (!session) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Failed: ${res.status}`);
  }
  return res.json();
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const ACTION_ICONS: Record<string, string> = {
  'document.viewed': '👁',
  'document.downloaded': '⬇️',
  'document.uploaded': '⬆️',
  'document.approved': '✅',
  'document.rejected': '❌',
  'document.deleted': '🗑',
  'hire.viewed': '👤',
  'hire.exported': '📦',
  'hire.anonymised': '🔒',
  'data.exported': '📤',
  'data.erasure_requested': '🗑',
  'data.erased': '🔒',
};

// ── Main page ──────────────────────────────────────────────────

export default function GdprPage() {
  const [tab, setTab] = useState<'log' | 'erasure' | 'policy' | 'retention'>('log');
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [erasureRequests, setErasureRequests] = useState<ErasureRequest[]>([]);
  const [policies, setPolicies] = useState<PrivacyPolicy[]>([]);
  const [currentPolicy, setCurrentPolicy] = useState<PrivacyPolicy | null>(null);
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newPolicyVersion, setNewPolicyVersion] = useState('');
  const [newPolicyDate, setNewPolicyDate] = useState('');
  const [newPolicyUrl, setNewPolicyUrl] = useState('');
  const [policySubmitting, setPolicySubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [log, erasure, policyData, expired] = await Promise.all([
        apiFetch<{ entries: AccessLogEntry[] }>('/gdpr/access-log?limit=50'),
        apiFetch<{ requests: ErasureRequest[] }>('/gdpr/erasure-requests'),
        apiFetch<{ policies: PrivacyPolicy[]; current: PrivacyPolicy | null }>('/gdpr/privacy-policy'),
        apiFetch<{ documents: ExpiredDoc[] }>('/gdpr/retention/expired'),
      ]);
      setAccessLog(log.entries);
      setErasureRequests(erasure.requests);
      setPolicies(policyData.policies);
      setCurrentPolicy(policyData.current);
      setExpiredDocs(expired.documents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load GDPR data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handlePublishPolicy(e: React.FormEvent) {
    e.preventDefault();
    setPolicySubmitting(true);
    try {
      await apiFetch('/gdpr/privacy-policy', {
        method: 'POST',
        body: JSON.stringify({
          version: newPolicyVersion,
          effectiveAt: newPolicyDate,
          contentUrl: newPolicyUrl || undefined,
        }),
      });
      setNewPolicyVersion('');
      setNewPolicyDate('');
      setNewPolicyUrl('');
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to publish policy');
    } finally {
      setPolicySubmitting(false);
    }
  }

  async function handleProcessErasure(requestId: string, status: 'completed' | 'rejected') {
    try {
      await apiFetch(`/gdpr/erasure-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to process request');
    }
  }

  const TABS = [
    { key: 'log', label: `Access Log (${accessLog.length})` },
    { key: 'erasure', label: `Erasure Requests (${erasureRequests.filter(r => r.status === 'pending').length} pending)`, alert: erasureRequests.some(r => r.status === 'pending') },
    { key: 'policy', label: 'Privacy Policy' },
    { key: 'retention', label: `Retention (${expiredDocs.length} expired)`, alert: expiredDocs.length > 0 },
  ] as const;

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">GDPR Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Data access log · Right to erasure · Privacy policy · Retention management
          </p>
        </div>

        {/* GDPR summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Access Events', value: accessLog.length, color: 'text-indigo-600', icon: '📋' },
            { label: 'Pending Erasure', value: erasureRequests.filter(r => r.status === 'pending').length, color: erasureRequests.some(r => r.status === 'pending') ? 'text-red-600' : 'text-gray-700', icon: '🗑' },
            { label: 'Current Policy', value: currentPolicy?.version ?? 'None', color: 'text-green-600', icon: '📜' },
            { label: 'Expired Docs', value: expiredDocs.length, color: expiredDocs.length > 0 ? 'text-yellow-600' : 'text-gray-700', icon: '⏰' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                </div>
                <span className="text-xl" aria-hidden="true">{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {'alert' in t && t.alert && (
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
            {/* ── Data Access Log ── */}
            {tab === 'log' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Data Access Log</h2>
                    <p className="text-xs text-gray-500 mt-0.5">GDPR Art. 30 — Records of Processing Activities</p>
                  </div>
                </div>
                {accessLog.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No access events recorded</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {accessLog.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true">{ACTION_ICONS[entry.action] ?? '📋'}</span>
                              <span className="text-xs font-mono text-gray-700">{entry.action}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="font-medium">{entry.entityType}</span>
                            {entry.entityId && (
                              <span className="text-gray-400 ml-1 font-mono">{entry.entityId.slice(0, 8)}…</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                            {entry.userId ? entry.userId.slice(0, 8) + '…' : 'system'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{entry.ipAddress ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Erasure Requests ── */}
            {tab === 'erasure' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Data Erasure Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">GDPR Art. 17 — Right to Erasure (Right to be Forgotten)</p>
                </div>
                {erasureRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No erasure requests</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Hire ID</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {erasureRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-gray-600">
                            {req.hireId ? req.hireId.slice(0, 12) + '…' : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                            {req.reason ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[req.status]}`}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleProcessErasure(req.id, 'completed')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                  Approve & Anonymise
                                </button>
                                <button
                                  onClick={() => handleProcessErasure(req.id, 'rejected')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {req.status !== 'pending' && (
                              <span className="text-xs text-gray-400">
                                {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Privacy Policy ── */}
            {tab === 'policy' && (
              <div className="space-y-5">
                {/* Current policy */}
                {currentPolicy && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-800">Current Policy — v{currentPolicy.version}</p>
                        <p className="text-xs text-green-600 mt-0.5">Effective from {currentPolicy.effectiveAt}</p>
                        {currentPolicy.contentUrl && (
                          <a
                            href={currentPolicy.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 underline mt-1 block"
                          >
                            View policy document ↗
                          </a>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    </div>
                  </div>
                )}

                {/* Publish new version */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Publish New Policy Version</h2>
                  <form onSubmit={handlePublishPolicy} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Version *</label>
                        <input
                          type="text"
                          required
                          value={newPolicyVersion}
                          onChange={(e) => setNewPolicyVersion(e.target.value)}
                          placeholder="e.g. 3.0"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Effective Date *</label>
                        <input
                          type="date"
                          required
                          value={newPolicyDate}
                          onChange={(e) => setNewPolicyDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Policy URL (optional)</label>
                      <input
                        type="url"
                        value={newPolicyUrl}
                        onChange={(e) => setNewPolicyUrl(e.target.value)}
                        placeholder="https://company.com/privacy-policy-v3"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={policySubmitting}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {policySubmitting ? 'Publishing…' : 'Publish Policy'}
                    </button>
                  </form>
                </div>

                {/* Version history */}
                {policies.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="text-sm font-semibold text-gray-900">Version History</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Effective</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Published</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {policies.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">v{p.version}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{p.effectiveAt}</td>
                            <td className="px-4 py-3">
                              {p.isCurrent ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Current</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Superseded</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Retention ── */}
            {tab === 'retention' && (
              <div className="space-y-5">
                {/* Retention policy info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-blue-800 mb-2">GDPR Retention Policy</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-blue-700">
                    {[
                      { category: 'Contracts', retention: '7 years (HGB §257)' },
                      { category: 'Tax forms', retention: '7 years' },
                      { category: 'Certificates', retention: '5 years' },
                      { category: 'Policies', retention: '3 years' },
                      { category: 'Training', retention: '3 years' },
                      { category: 'Personal ID', retention: '1 year' },
                    ].map((r) => (
                      <div key={r.category} className="bg-blue-100 rounded-lg px-3 py-2">
                        <p className="font-medium">{r.category}</p>
                        <p className="text-blue-600">{r.retention}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expired documents */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Documents Past Retention Date</h2>
                    <p className="text-xs text-gray-500 mt-0.5">These documents should be reviewed and deleted to comply with data minimisation</p>
                  </div>
                  {expiredDocs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-2xl mb-2">✅</p>
                      <p className="text-gray-600 font-medium">No expired documents</p>
                      <p className="text-sm text-gray-400 mt-1">All documents are within their retention period</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Retention Until</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Days Expired</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expiredDocs.map((doc) => {
                          const daysExpired = Math.floor(
                            (Date.now() - new Date(doc.retentionUntil).getTime()) / 86400000,
                          );
                          return (
                            <tr key={doc.id} className="hover:bg-red-50/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span aria-hidden="true">📄</span>
                                  <span className="font-medium text-gray-900">{doc.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600 capitalize">
                                {doc.category.replace('_', ' ')}
                              </td>
                              <td className="px-4 py-3 text-xs text-red-600 font-medium">
                                {doc.retentionUntil}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  {daysExpired}d expired
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* GDPR compliance notice */}
        <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-700 mb-1">GDPR Compliance Coverage</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
            <span>✅ Art. 15 — Right of Access</span>
            <span>✅ Art. 17 — Right to Erasure</span>
            <span>✅ Art. 30 — Processing Records</span>
            <span>✅ Art. 5 — Data Minimisation</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
