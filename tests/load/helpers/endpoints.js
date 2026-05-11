// tests/load/helpers/endpoints.js
export const readEndpoints = [
  { method: 'GET', url: '/api/hires' },
  { method: 'GET', url: '/api/tasks' },
  { method: 'GET', url: '/api/analytics/overview' },
  { method: 'GET', url: '/api/notifications/unread-count' },
  { method: 'GET', url: '/api/documents/company' },
  { method: 'GET', url: '/api/it-checklists' },
  { method: 'GET', url: '/api/manager/dashboard' },
];

export const analyticsEndpoints = [
  { method: 'GET', url: '/api/analytics/completion-by-department' },
  { method: 'GET', url: '/api/analytics/phase-time' },
  { method: 'GET', url: '/api/analytics/active-hires' },
  { method: 'GET', url: '/api/analytics/document-review-queue' },
];

export const writeEndpoints = [
  { method: 'PATCH', url: '/api/tasks/htask-0003/complete?hireId=hire-0001-0001-0001-000000000001', body: {} },
  { method: 'POST', url: '/api/notifications/jobs/tick', body: {} },
];

export function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}
