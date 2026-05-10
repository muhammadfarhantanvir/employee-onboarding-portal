'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import {
  OnboardingTemplate,
  Phase,
  PHASE_ORDER,
  TemplateTask,
} from '@/lib/types';
import { PhaseSection } from './PhaseSection';
import { TaskForm } from './TaskForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';

interface TemplateEditorProps {
  template: OnboardingTemplate;
  onBack: () => void;
  onTemplateChange: (updated: OnboardingTemplate) => void;
}

export function TemplateEditor({
  template,
  onBack,
  onTemplateChange,
}: TemplateEditorProps) {
  const [tasks, setTasks] = useState<TemplateTask[]>(
    [...template.tasks].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [addTaskPhase, setAddTaskPhase] = useState<Phase | null>(null);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<TemplateTask | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Drag & Drop ──────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({
      ...t,
      sortOrder: i,
    }));
    setTasks(reordered);

    try {
      const updated = await api.reorderTasks(
        template.id,
        reordered.map((t) => t.id),
      );
      onTemplateChange(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save order');
      // Revert on failure
      setTasks([...template.tasks].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }

  // ── Add Task ─────────────────────────────────────────────────

  const handleAddTask = useCallback(async (values: {
    title: string;
    description: string;
    taskType: string;
    phase: string;
    assignedRole: string;
    dueDayOffset: number;
    isRequired: boolean;
  }) => {
    if (!addTaskPhase) return;
    const newTask = await api.addTask(template.id, {
      ...values,
      phase: addTaskPhase,
    });
    setTasks((prev) => [...prev, newTask]);
    onTemplateChange({ ...template, tasks: [...tasks, newTask] });
    setAddTaskPhase(null);
  }, [addTaskPhase, template, tasks, onTemplateChange]);

  // ── Edit Task ────────────────────────────────────────────────

  const handleEditTask = useCallback(async (values: {
    title: string;
    description: string;
    taskType: string;
    phase: string;
    assignedRole: string;
    dueDayOffset: number;
    isRequired: boolean;
  }) => {
    if (!editingTask) return;
    const updated = await api.updateTask(template.id, editingTask.id, values);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    onTemplateChange({
      ...template,
      tasks: tasks.map((t) => (t.id === updated.id ? updated : t)),
    });
    setEditingTask(null);
  }, [editingTask, template, tasks, onTemplateChange]);

  // ── Delete Task ──────────────────────────────────────────────

  async function confirmDeleteTask() {
    if (!deletingTask) return;
    setSaving(true);
    try {
      await api.deleteTask(template.id, deletingTask.id);
      const remaining = tasks.filter((t) => t.id !== deletingTask.id);
      setTasks(remaining);
      onTemplateChange({ ...template, tasks: remaining });
      setDeletingTask(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  const tasksByPhase = (phase: Phase) =>
    tasks.filter((t) => t.phase === phase);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
            aria-label="Back to template library"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {template.name}
            </h1>
            {template.department && (
              <p className="text-xs text-gray-500">{template.department}</p>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between"
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

        {/* Phase hint */}
        <p className="text-sm text-gray-500 mb-5">
          Drag tasks to reorder them within a phase. Use the{' '}
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">
            Tab
          </kbd>{' '}
          key and{' '}
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">
            Space
          </kbd>{' '}
          for keyboard reordering.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-5">
            {PHASE_ORDER.map((phase) => (
              <PhaseSection
                key={phase}
                phase={phase}
                tasks={tasksByPhase(phase)}
                onAddTask={(p) => setAddTaskPhase(p)}
                onEditTask={(task) => setEditingTask(task)}
                onDeleteTask={(task) => setDeletingTask(task)}
              />
            ))}
          </div>
        </DndContext>
      </main>

      {/* Add Task Modal */}
      <Modal
        open={addTaskPhase !== null}
        onClose={() => setAddTaskPhase(null)}
        title={addTaskPhase ? `Add Task — ${addTaskPhase.replace(/_/g, ' ')}` : 'Add Task'}
      >
        {addTaskPhase && (
          <TaskForm
            initial={{ phase: addTaskPhase }}
            onSubmit={handleAddTask}
            onCancel={() => setAddTaskPhase(null)}
            submitLabel="Add Task"
          />
        )}
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <TaskForm
            initial={{
              title: editingTask.title,
              description: editingTask.description ?? '',
              taskType: editingTask.taskType,
              phase: editingTask.phase,
              assignedRole: editingTask.assignedRole,
              dueDayOffset: editingTask.dueDayOffset,
              isRequired: editingTask.isRequired,
            }}
            onSubmit={handleEditTask}
            onCancel={() => setEditingTask(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deletingTask !== null}
        onClose={() => setDeletingTask(null)}
        title="Delete Task"
        size="sm"
      >
        {deletingTask && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{deletingTask.title}</strong>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingTask(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteTask}
                loading={saving}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
