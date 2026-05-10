'use client';

import React from 'react';
import { OnboardingTemplate, PHASE_LABELS, PHASE_ORDER } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TemplateCardProps {
  template: OnboardingTemplate;
  onOpen: (template: OnboardingTemplate) => void;
  onDuplicate: (template: OnboardingTemplate) => void;
  onDelete: (template: OnboardingTemplate) => void;
}

export function TemplateCard({
  template,
  onOpen,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const tasksByPhase = PHASE_ORDER.map((phase) => ({
    phase,
    count: template.tasks.filter((t) => t.phase === phase).length,
  })).filter((p) => p.count > 0);

  return (
    <article
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4"
      aria-label={`Template: ${template.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {template.name}
            </h3>
            {template.isDefault && (
              <Badge variant="indigo">Default</Badge>
            )}
          </div>
          {template.department && (
            <p className="text-xs text-gray-500 mt-0.5">{template.department}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-sm font-medium text-gray-500">
          {template.tasks.length} tasks
        </span>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
      )}

      {/* Phase breakdown */}
      {tasksByPhase.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Tasks by phase">
          {tasksByPhase.map(({ phase, count }) => (
            <span
              key={phase}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5"
            >
              <span className="font-medium">{PHASE_LABELS[phase]}</span>
              <span className="text-gray-400">·</span>
              <span>{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpen(template)}
          className="flex-1"
        >
          Edit Template
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDuplicate(template)}
          aria-label={`Duplicate ${template.name}`}
          title="Duplicate template"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </Button>
        <button
          onClick={() => onDelete(template)}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label={`Delete ${template.name}`}
          title="Delete template"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </article>
  );
}
