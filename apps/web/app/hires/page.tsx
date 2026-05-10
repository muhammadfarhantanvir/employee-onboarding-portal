'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getSession } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type HireStatus = 'pending_invite' | 'in_progress' | 'at_risk' | 'completed' | 'cancelled';

interface Hire {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  startDate: string;
  status: HireStatus;
  completionPct: number;
}

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
  at_risk: 'At Risk',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

async function fetchHires(): Promise<Hire[]> {
  const session = getSession();
  if (!session) return [];
  const res = await fetch(`${API_BASE}/hires`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Company-Slug': session.companySlug,
    },
  });
  if (!res.ok) throw new Error('Failed to load hires');
  const data = await res.json();
  return data.hires ?? [];
}

export default function HiresPage() {
  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHires()
      .then(setHires)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hires</h1>
            <p className="text-sm text-gray-500 mt-1">Track all active onboarding journeys</p>
          </div>
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
        ) : hires.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No hires found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hires.map((hire) => (
                  <tr key={hire.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{hire.fullName}</p>
                      <p className="text-xs text-gray-400">{hire.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {hire.jobTitle ?? '—'}
                      {hire.department && (
                        <span className="ml-1 text-xs text-gray-400">· {hire.department}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{hire.startDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[hire.status]}`}>
                        {STATUS_LABELS[hire.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-24">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${hire.completionPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{hire.completionPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
