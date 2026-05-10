'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OnboardingTemplate } from '@/lib/types';
import * as api from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import { TemplateEditor } from './TemplateEditor';
import { TemplateForm } from './TemplateForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type View = 'library' | 'editor';

export function TemplateLibrary() {
  const [view, setView] = useState<View>('library');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<OnboardingTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<OnboardingTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<OnboardingTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search / filter
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // ── Load templates ───────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { templates: data } = await api.listTemplates();
      setTemplates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ── Derived data ─────────────────────────────────────────────

  const departments = Array.from(
    new Set(templates.map((t) => t.department).filter(Boolean) as string[]),
  ).sort();

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.department ?? '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || t.department === filterDept;
    return matchSearch && matchDept;
  });

  // ── Handlers ─────────────────────────────────────────────────

  async function handleCreate(values: {
    name: string;
    description: string;
    department: string;
  }) {
    const created = await api.createTemplate(values);
    setTemplates((prev) => [...prev, created]);
    setShowCreateModal(false);
    // Open the editor immediately
    setActiveTemplate(created);
    setView('editor');
  }

  async function handleDuplicate(values: {
    name: string;
    description: string;
    department: string;
  }) {
    if (!duplicatingTemplate) return;
    const clone = await api.duplicateTemplate(duplicatingTemplate.id, {
      name: values.name,
      department: values.department,
    });
    setTemplates((prev) => [...prev, clone]);
    setDuplicatingTemplate(null);
    // Open the editor for the clone
    setActiveTemplate(clone);
    setView('editor');
  }

  async function confirmDelete() {
    if (!deletingTemplate) return;
    setDeleteLoading(true);
    try {
      await api.deleteTemplate(deletingTemplate.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
      setDeletingTemplate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleTemplateChange(updated: OnboardingTemplate) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    setActiveTemplate(updated);
  }

  // ── Editor view ──────────────────────────────────────────────

  if (view === 'editor' && activeTemplate) {
    return (
      <TemplateEditor
        template={activeTemplate}
        onBack={() => {
          setView('library');
          setActiveTemplate(null);
        }}
        onTemplateChange={handleTemplateChange}
      />
    );
  }

  // ── Library view ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Onboarding Templates
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Reusable onboarding plans per role. Drag tasks to reorder, duplicate to customise.
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Template
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700 focus:outline-none"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              aria-label="Search templates"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {departments.length > 0 && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              aria-label="Filter by department"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20" aria-live="polite" aria-busy="true">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="sr-only">Loading templates…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4" aria-hidden="true">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {search || filterDept ? 'No templates match your filters' : 'No templates yet'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {search || filterDept
                ? 'Try adjusting your search or filter.'
                : 'Create your first onboarding template to get started.'}
            </p>
            {!search && !filterDept && (
              <Button onClick={() => setShowCreateModal(true)}>
                Create Template
              </Button>
            )}
          </div>
        )}

        {/* Template grid */}
        {!loading && filtered.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-label={`${filtered.length} template${filtered.length !== 1 ? 's' : ''}`}
          >
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onOpen={(t) => {
                  setActiveTemplate(t);
                  setView('editor');
                }}
                onDuplicate={(t) => setDuplicatingTemplate(t)}
                onDelete={(t) => setDeletingTemplate(t)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Template Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Onboarding Template"
      >
        <TemplateForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          submitLabel="Create Template"
        />
      </Modal>

      {/* Duplicate Template Modal */}
      <Modal
        open={duplicatingTemplate !== null}
        onClose={() => setDuplicatingTemplate(null)}
        title="Duplicate Template"
      >
        {duplicatingTemplate && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Creating a copy of{' '}
              <strong className="text-gray-900">{duplicatingTemplate.name}</strong>.
              All tasks will be duplicated. You can customise the name and department below.
            </p>
            <TemplateForm
              initial={{
                name: `${duplicatingTemplate.name} (Copy)`,
                description: duplicatingTemplate.description ?? '',
                department: duplicatingTemplate.department ?? '',
              }}
              onSubmit={handleDuplicate}
              onCancel={() => setDuplicatingTemplate(null)}
              submitLabel="Duplicate & Edit"
            />
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deletingTemplate !== null}
        onClose={() => setDeletingTemplate(null)}
        title="Delete Template"
        size="sm"
      >
        {deletingTemplate && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{deletingTemplate.name}</strong>?
              This will remove all {deletingTemplate.tasks.length} tasks and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingTemplate(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={deleteLoading}
              >
                Delete Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
