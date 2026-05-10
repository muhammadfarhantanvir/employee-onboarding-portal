'use client';

import React, { useState } from 'react';
import {
  TaskType,
  Phase,
  AssignedRole,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  PHASE_LABELS,
  PHASE_ORDER,
  ASSIGNED_ROLES,
  ASSIGNED_ROLE_LABELS,
  TemplateTask,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface TaskFormValues {
  title: string;
  description: string;
  taskType: TaskType;
  phase: Phase;
  assignedRole: AssignedRole;
  dueDayOffset: number;
  isRequired: boolean;
}

interface TaskFormProps {
  initial?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const defaultValues: TaskFormValues = {
  title: '',
  description: '',
  taskType: 'checkbox',
  phase: 'week_1',
  assignedRole: 'new_hire',
  dueDayOffset: 0,
  isRequired: true,
};

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save Task',
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>({
    ...defaultValues,
    ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError('Title is required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          required
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Setup Workstation"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="task-description"
          rows={2}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Optional instructions or context"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Task Type + Phase */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 mb-1">
            Task Type
          </label>
          <select
            id="task-type"
            value={values.taskType}
            onChange={(e) => set('taskType', e.target.value as TaskType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-phase" className="block text-sm font-medium text-gray-700 mb-1">
            Phase
          </label>
          <select
            id="task-phase"
            value={values.phase}
            onChange={(e) => set('phase', e.target.value as Phase)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {PHASE_ORDER.map((p) => (
              <option key={p} value={p}>
                {PHASE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assigned Role + Due Day Offset */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-role" className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <select
            id="task-role"
            value={values.assignedRole}
            onChange={(e) => set('assignedRole', e.target.value as AssignedRole)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {ASSIGNED_ROLES.map((r) => (
              <option key={r} value={r}>
                {ASSIGNED_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-offset" className="block text-sm font-medium text-gray-700 mb-1">
            Due Day Offset
          </label>
          <input
            id="task-offset"
            type="number"
            value={values.dueDayOffset}
            onChange={(e) => set('dueDayOffset', parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Relative to start date (e.g. -3 = 3 days before)
          </p>
        </div>
      </div>

      {/* Required toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={values.isRequired}
          onClick={() => set('isRequired', !values.isRequired)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
            values.isRequired ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              values.isRequired ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">Required task</span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
