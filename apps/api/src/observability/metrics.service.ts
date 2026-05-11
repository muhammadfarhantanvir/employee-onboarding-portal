import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import type { Server } from 'http';
import type { Socket } from 'net';

interface HttpRequestLabels {
  method: string;
  route: string;
  statusCode: number;
}

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry = new Registry();
  private readonly activeSockets = new Set<Socket>();
  private serverTrackingAttached = false;

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: ['method', 'route', 'status_code', 'status_class'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  private readonly activeRequests = new Gauge({
    name: 'nodejs_active_requests',
    help: 'In-flight HTTP requests handled by the NestJS API.',
    registers: [this.registry],
  });

  private readonly activeConnections = new Gauge({
    name: 'nodejs_active_connections',
    help: 'Active TCP connections accepted by the NestJS HTTP server.',
    registers: [this.registry],
  });

  private readonly activeHires = new Gauge({
    name: 'onboarding_active_hires',
    help: 'Active hires currently being onboarded.',
    labelNames: ['company_id'] as const,
    registers: [this.registry],
  });

  private readonly tasksCompleted = new Counter({
    name: 'onboarding_tasks_completed_total',
    help: 'Onboarding tasks completed.',
    labelNames: ['company_id'] as const,
    registers: [this.registry],
  });

  private readonly documentsUploaded = new Counter({
    name: 'onboarding_documents_uploaded_total',
    help: 'Documents uploaded into the onboarding portal.',
    labelNames: ['company_id', 'category'] as const,
    registers: [this.registry],
  });

  private readonly hireInvitesSent = new Counter({
    name: 'onboarding_hire_invites_sent_total',
    help: 'Hire invite emails created or resent.',
    labelNames: ['company_id'] as const,
    registers: [this.registry],
  });

  private readonly bullMqEmailJobsSent = new Counter({
    name: 'onboarding_bullmq_email_jobs_sent_total',
    help: 'Email jobs sent by the workflow queue path.',
    labelNames: ['company_id', 'template'] as const,
    registers: [this.registry],
  });

  private readonly failedDocumentVirusScans = new Counter({
    name: 'onboarding_failed_document_virus_scans_total',
    help: 'Document virus scans that failed.',
    labelNames: ['company_id'] as const,
    registers: [this.registry],
  });

  private readonly onboardingCompletionRate = new Gauge({
    name: 'onboarding_completion_rate_percent',
    help: 'Current onboarding completion rate as a percentage.',
    labelNames: ['company_id'] as const,
    registers: [this.registry],
  });

  private readonly bullMqJobsCompleted = new Counter({
    name: 'bullmq_jobs_completed_total',
    help: 'BullMQ-compatible workflow jobs completed.',
    labelNames: ['queue', 'job_name'] as const,
    registers: [this.registry],
  });

  private readonly bullMqJobsFailed = new Counter({
    name: 'bullmq_jobs_failed_total',
    help: 'BullMQ-compatible workflow jobs failed.',
    labelNames: ['queue', 'job_name'] as const,
    registers: [this.registry],
  });

  private readonly bullMqQueueWaitingJobs = new Gauge({
    name: 'bullmq_queue_waiting_jobs',
    help: 'BullMQ-compatible waiting job depth.',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly bullMqJobProcessingDuration = new Histogram({
    name: 'bullmq_job_processing_duration_seconds',
    help: 'BullMQ-compatible workflow job processing duration in seconds.',
    labelNames: ['queue', 'job_name'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 30],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
    });

    this.activeRequests.set(0);
    this.activeConnections.set(0);
    this.bullMqQueueWaitingJobs.labels('workflow').set(0);
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  startHttpRequest(): void {
    this.activeRequests.inc();
  }

  finishHttpRequest(labels: HttpRequestLabels, durationSeconds: number): void {
    this.activeRequests.dec();
    this.httpRequestDuration
      .labels(
        labels.method,
        labels.route,
        String(labels.statusCode),
        this.statusClass(labels.statusCode),
      )
      .observe(durationSeconds);
  }

  trackHttpServer(server: Server): void {
    if (this.serverTrackingAttached) {
      return;
    }

    this.serverTrackingAttached = true;
    server.on('connection', (socket: Socket) => {
      this.activeSockets.add(socket);
      this.activeConnections.set(this.activeSockets.size);
      socket.on('close', () => {
        this.activeSockets.delete(socket);
        this.activeConnections.set(this.activeSockets.size);
      });
    });
  }

  setActiveHires(companyId: string, count: number): void {
    this.activeHires.labels(companyId).set(count);
  }

  recordTaskCompleted(companyId: string): void {
    this.tasksCompleted.labels(companyId).inc();
  }

  recordDocumentUploaded(companyId: string, category: string): void {
    this.documentsUploaded.labels(companyId, category).inc();
  }

  recordHireInviteSent(companyId: string): void {
    this.hireInvitesSent.labels(companyId).inc();
  }

  recordBullMqEmailJobSent(companyId: string, template: string): void {
    this.bullMqEmailJobsSent.labels(companyId, template).inc();
  }

  recordFailedDocumentVirusScan(companyId: string): void {
    this.failedDocumentVirusScans.labels(companyId).inc();
  }

  setOnboardingCompletionRate(companyId: string, percentage: number): void {
    this.onboardingCompletionRate.labels(companyId).set(percentage);
  }

  recordBullMqJobCompleted(queue: string, jobName: string): void {
    this.bullMqJobsCompleted.labels(queue, jobName).inc();
  }

  recordBullMqJobFailed(queue: string, jobName: string): void {
    this.bullMqJobsFailed.labels(queue, jobName).inc();
  }

  setBullMqQueueDepth(queue: string, waitingJobs: number): void {
    this.bullMqQueueWaitingJobs.labels(queue).set(waitingJobs);
  }

  observeBullMqJobDuration(
    queue: string,
    jobName: string,
    durationSeconds: number,
  ): void {
    this.bullMqJobProcessingDuration.labels(queue, jobName).observe(durationSeconds);
  }

  onModuleDestroy(): void {
    this.activeSockets.clear();
  }

  private statusClass(statusCode: number): string {
    if (!Number.isFinite(statusCode) || statusCode < 100) {
      return 'unknown';
    }
    return `${Math.floor(statusCode / 100)}xx`;
  }
}
