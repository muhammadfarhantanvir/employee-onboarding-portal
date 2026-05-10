import React from 'react';
import { TaskType, TASK_TYPE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

const taskTypeVariants: Record<TaskType, 'blue' | 'green' | 'purple' | 'yellow' | 'indigo'> = {
  checkbox: 'blue',
  document_upload: 'green',
  form_submission: 'purple',
  acknowledgement: 'yellow',
  meeting: 'indigo',
};

const taskTypeIcons: Record<TaskType, string> = {
  checkbox: '✓',
  document_upload: '📄',
  form_submission: '📝',
  acknowledgement: '👁',
  meeting: '📅',
};

interface TaskTypeBadgeProps {
  type: TaskType;
}

export function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  return (
    <Badge variant={taskTypeVariants[type]}>
      <span aria-hidden="true" className="mr-1">{taskTypeIcons[type]}</span>
      {TASK_TYPE_LABELS[type]}
    </Badge>
  );
}
