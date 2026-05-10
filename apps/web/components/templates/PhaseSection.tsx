'use client';

import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Phase, PHASE_LABELS, TemplateTask } from '@/lib/types';
import { SortableTaskRow } from './SortableTaskRow';
import { Button } from '@/components/ui/Button';

const phaseColors: Record<Phase, string> = {
  pre_boarding: 'border-l-orange-400 bg-orange-50',
  week_1: 'border-l-blue-400 bg-blue-50',
  month_1: 'border-l-green-400 bg-green-50',
  month_3: 'border-l-purple-400 bg-purple-50',
};

const phaseHeaderColors: Record<Phase, string> = {
  pre_boarding: 'text-orange-700',
  week_1: 'text-blue-700',
  month_1: 'text-green-700',
  month_3: 'text-purple-700',
};

interface PhaseSectionProps {
  phase: Phase;
  tasks: TemplateTask[];
  onAddTask: (phase: Phase) => void;
  onEditTask: (task: TemplateTask) => void;
  onDeleteTask: (task: TemplateTask) => void;
}

export function PhaseSection({
  phase,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: PhaseSectionProps) {
  return (
    <section
      aria-labelledby={`phase-${phase}-heading`}
      className={`rounded-xl border-l-4 p-4 ${phaseColors[phase]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3
            id={`phase-${phase}-heading`}
            className={`text-sm font-semibold uppercase tracking-wide ${phaseHeaderColors[phase]}`}
          >
            {PHASE_LABELS[phase]}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddTask(phase)}
          aria-label={`Add task to ${PHASE_LABELS[phase]}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
          <p className="text-sm text-gray-400">No tasks yet</p>
          <button
            onClick={() => onAddTask(phase)}
            className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 underline focus:outline-none"
          >
            Add the first task
          </button>
        </div>
      ) : (
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </section>
  );
}
