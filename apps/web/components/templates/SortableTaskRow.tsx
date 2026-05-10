'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TemplateTask, ASSIGNED_ROLE_LABELS } from '@/lib/types';
import { TaskTypeBadge } from './TaskTypeBadge';
import { Badge } from '@/components/ui/Badge';

interface SortableTaskRowProps {
  task: TemplateTask;
  onEdit: (task: TemplateTask) => void;
  onDelete: (task: TemplateTask) => void;
}

export function SortableTaskRow({ task, onEdit, onDelete }: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const dueDayLabel =
    task.dueDayOffset === 0
      ? 'Day 0 (start)'
      : task.dueDayOffset > 0
      ? `Day +${task.dueDayOffset}`
      : `Day ${task.dueDayOffset}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-indigo-400' : 'hover:shadow-md'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 focus:outline-none focus:text-gray-500"
        aria-label={`Drag to reorder: ${task.title}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
          {!task.isRequired && (
            <Badge variant="gray">Optional</Badge>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <TaskTypeBadge type={task.taskType} />
          <Badge variant="default">{ASSIGNED_ROLE_LABELS[task.assignedRole]}</Badge>
          <span className="text-xs text-gray-400">{dueDayLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={`Edit task: ${task.title}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task)}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label={`Delete task: ${task.title}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
