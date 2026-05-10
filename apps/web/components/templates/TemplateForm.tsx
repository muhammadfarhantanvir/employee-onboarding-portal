'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface TemplateFormValues {
  name: string;
  description: string;
  department: string;
}

interface TemplateFormProps {
  initial?: Partial<TemplateFormValues>;
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function TemplateForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Create Template',
}: TemplateFormProps) {
  const [values, setValues] = useState<TemplateFormValues>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    department: initial?.department ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Template name is required');
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

      <div>
        <label htmlFor="tpl-name" className="block text-sm font-medium text-gray-700 mb-1">
          Template Name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="tpl-name"
          type="text"
          required
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Software Engineer"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="tpl-dept" className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <input
          id="tpl-dept"
          type="text"
          value={values.department}
          onChange={(e) => set('department', e.target.value)}
          placeholder="e.g. Engineering"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="tpl-desc" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="tpl-desc"
          rows={3}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Brief description of this onboarding plan"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

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
