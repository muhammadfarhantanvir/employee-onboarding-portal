'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

interface ItChecklist {
  id: string;
  hireId: string;
  assignedTo: string | null;
  status: ChecklistStatus;
  completionPct: number;
  dueDate: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    assetTag: string | null;
    serialNumber: string | null;
    isRequired: boolean;
  }>;
}

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

const ITEM_STATUS_ICONS: Record<string, string> = {
  pending: '○',
  in_progress: '◑',
  completed: '●',
  skipped: '—',
  blocked: '✕',
};

const CATEGORY_ICONS: Record<string, string> = {
  hardware: '💻',
  software: '📦',
  access: '🔑',
  communication: '💬',
  security: '🔒',
  other: '📌',
};

async function fetchChecklists(): Promise<ItChecklist[]> {
  const session = getSession();
  if (!session) return [];
  const res = await fetch(`${API_BASE}/it-checklists`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.checklists ?? [];
}

export default function ItChecklistsPage() {
  const [checklists, setChecklists] = useState<ItChecklist[]>([]);
  const [selected, setSelected] = useState<ItChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklists()
      .then((data) => {
        setChecklists(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">IT Checklists</h1>
          <p className="text-sm text-gray-500 mt-1">Equipment provisioning and access setup for new hires</p>
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
        ) : checklists.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No IT checklists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist list */}
            <div className="space-y-3">
              {checklists.map((cl) => (
                <button
                  key={cl.id}
                  onClick={() => setSelected(cl)}
                  className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                    selected?.id === cl.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[cl.status]}`}>
                      {cl.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{cl.completionPct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${cl.completionPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {cl.items.filter((i) => i.status === 'completed').length} / {cl.items.length} items done
                  </p>
                  {cl.dueDate && (
                    <p className="text-xs text-gray-400 mt-1">Due {cl.dueDate}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Checklist detail */}
            {selected && (
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Checklist Items</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[selected.status]}`}>
                    {selected.completionPct}% complete
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <span
                        className={`text-lg flex-shrink-0 mt-0.5 ${item.status === 'completed' ? 'text-green-500' : item.status === 'blocked' ? 'text-red-500' : 'text-gray-400'}`}
                        aria-hidden="true"
                      >
                        {ITEM_STATUS_ICONS[item.status] ?? '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true">{CATEGORY_ICONS[item.category] ?? '📌'}</span>
                          <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </p>
                          {!item.isRequired && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Optional</span>
                          )}
                        </div>
                        {(item.assetTag || item.serialNumber) && (
                          <div className="flex gap-3 mt-1 text-xs text-gray-400">
                            {item.assetTag && <span>Tag: <code className="bg-gray-100 px-1 rounded">{item.assetTag}</code></span>}
                            {item.serialNumber && <span>S/N: <code className="bg-gray-100 px-1 rounded">{item.serialNumber}</code></span>}
                          </div>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs text-gray-400 capitalize">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
