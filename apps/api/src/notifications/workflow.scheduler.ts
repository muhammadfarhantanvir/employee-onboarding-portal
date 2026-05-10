import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

/**
 * WorkflowScheduler — polls for due workflow jobs every 60 seconds.
 *
 * In production this is replaced by BullMQ repeat jobs:
 *   queue.add('check_overdue_tasks', {}, { repeat: { every: 3600000 } })
 *
 * The scheduler runs against the demo company only.
 * In a real multi-tenant system it would iterate all active companies.
 */
@Injectable()
export class WorkflowScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowScheduler.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /** Tick interval in ms — 60 s in production, 10 s in dev for demo visibility */
  private readonly TICK_MS = process.env.NODE_ENV === 'production' ? 60_000 : 10_000;

  /** Demo company ID — in production iterate all companies from DB */
  private readonly DEMO_COMPANY_ID = '11111111-1111-4111-8111-111111111111';

  constructor(private readonly workflowService: WorkflowService) {}

  onModuleInit(): void {
    this.logger.log(
      `[SCHEDULER] Starting workflow scheduler (tick every ${this.TICK_MS / 1000}s)`,
    );
    this.intervalHandle = setInterval(() => this.tick(), this.TICK_MS);
    // Run once immediately on startup
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.log('[SCHEDULER] Workflow scheduler stopped');
    }
  }

  private async tick(): Promise<void> {
    try {
      const result = await this.workflowService.processDueJobs(
        this.DEMO_COMPANY_ID,
      );
      if (result.processed > 0 || result.failed > 0) {
        this.logger.log(
          `[SCHEDULER TICK] processed=${result.processed} failed=${result.failed}`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        `[SCHEDULER TICK ERROR] ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
