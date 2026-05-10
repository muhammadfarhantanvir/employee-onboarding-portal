import { Controller, Get, Query, UseGuards, Res, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { CompanyId } from '../common/decorators/company-id.decorator';
import {
  analyticsOverviewSchema,
  activeHiresResponseSchema,
  departmentCompletionSchema,
  phaseTimeRowSchema,
  overdueTasksResponseSchema,
  overdueTaskRowSchema,
  documentReviewQueueSchema,
  hireCohortPointSchema,
  realtimeConfigSchema,
  hireSchema,
  notFoundSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { AnalyticsService } from './analytics.service';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 401 }, message: { type: 'string', example: 'Unauthorized' } } },
};
const FORBIDDEN = {
  description: '403 — Insufficient permissions',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'Forbidden resource' } } },
};

@ApiTags('Analytics & HR Dashboard')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ── GET /analytics/overview ────────────────────────────────────

  @ApiOperation({
    summary: 'KPI overview — top-level dashboard metrics',
    description:
      'Returns the key performance indicators for the HR dashboard: ' +
      'active hires, at-risk count, completion rate, pending documents, ' +
      'overdue task count, and average completion %. ' +
      'Poll this endpoint every 30s or subscribe via Supabase Realtime for live updates.',
  })
  @ApiOkResponse({ description: '200 — Overview metrics returned', schema: analyticsOverviewSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('overview')
  getOverview(@CompanyId() companyId: string) {
    return this.analyticsService.getOverview(companyId);
  }

  // ── GET /analytics/active-hires ────────────────────────────────

  @ApiOperation({
    summary: 'Active onboardings table',
    description:
      'Returns all non-cancelled hires enriched with task progress, ' +
      'days active, days remaining, overdue task count, and per-phase breakdown. ' +
      'Sorted: at_risk → in_progress → pending_invite → completed. ' +
      'This is the main data source for the HR real-time dashboard table.',
  })
  @ApiOkResponse({ description: '200 — Active hires returned', schema: activeHiresResponseSchema })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get('active-hires')
  getActiveHires(@CompanyId() companyId: string) {
    return this.analyticsService.getActiveHires(companyId);
  }

  // ── GET /analytics/completion-by-department ────────────────────

  @ApiOperation({
    summary: 'Completion rate by department',
    description:
      'Returns onboarding completion rates grouped by department. ' +
      'Useful for identifying which teams have the most at-risk hires.',
  })
  @ApiOkResponse({
    description: '200 — Department breakdown returned',
    schema: { type: 'array', items: departmentCompletionSchema },
  })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('completion-by-department')
  getCompletionByDepartment(@CompanyId() companyId: string) {
    return this.analyticsService.getCompletionByDepartment(companyId);
  }

  // ── GET /analytics/phase-time ──────────────────────────────────

  @ApiOperation({
    summary: 'Average time to complete by phase',
    description:
      'Returns per-phase metrics: average days to complete, ' +
      'completed task count, pending count, and overdue count. ' +
      'Identifies bottleneck phases in the onboarding process.',
  })
  @ApiOkResponse({
    description: '200 — Phase time metrics returned',
    schema: { type: 'array', items: phaseTimeRowSchema },
  })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('phase-time')
  getPhaseTime(@CompanyId() companyId: string) {
    return this.analyticsService.getPhaseTimeMetrics(companyId);
  }

  // ── GET /analytics/overdue-tasks ───────────────────────────────

  @ApiOperation({
    summary: 'All overdue required tasks across active hires',
    description:
      'Returns every overdue required task across all in_progress and at_risk hires. ' +
      'Sorted by days overdue descending (most urgent first). ' +
      'HR can use this to send one-click reminders.',
  })
  @ApiOkResponse({ description: '200 — Overdue tasks returned', schema: overdueTasksResponseSchema })
  @RequirePermissions(Permission.VIEW_ALL_TASKS)
  @Get('overdue-tasks')
  getOverdueTasks(@CompanyId() companyId: string) {
    return this.analyticsService.getOverdueTasks(companyId);
  }

  // ── GET /analytics/document-review-queue ──────────────────────

  @ApiOperation({
    summary: 'Document review queue — pending HR review',
    description:
      'Returns all documents awaiting HR review, sorted oldest-first (FIFO). ' +
      'Includes hire name, category, and days waiting. ' +
      'This powers the document review queue widget on the HR dashboard.',
  })
  @ApiOkResponse({ description: '200 — Document review queue returned', schema: documentReviewQueueSchema })
  @RequirePermissions(Permission.REVIEW_DOCUMENTS)
  @Get('document-review-queue')
  getDocumentReviewQueue(@CompanyId() companyId: string) {
    return this.analyticsService.getDocumentReviewQueue(companyId);
  }

  // ── GET /analytics/hire-cohort ─────────────────────────────────

  @ApiOperation({
    summary: 'Monthly hire cohort chart data',
    description:
      'Returns monthly hire volume for the last N months. ' +
      'Each point includes invited, completed, and at-risk counts. ' +
      'Used to render the line/bar chart on the analytics page.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to include (default 6, max 24)' })
  @ApiOkResponse({
    description: '200 — Cohort data returned',
    schema: { type: 'array', items: hireCohortPointSchema },
  })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('hire-cohort')
  getHireCohort(
    @CompanyId() companyId: string,
    @Query('months') months?: string,
  ) {
    const m = months ? Math.min(parseInt(months, 10), 24) : 6;
    return this.analyticsService.getHireCohort(companyId, m);
  }

  // ── GET /analytics/realtime-config ────────────────────────────

  @ApiOperation({
    summary: 'Supabase Realtime subscription config',
    description:
      'Returns the Supabase Realtime channel name and table list for the HR dashboard. ' +
      'The frontend uses this to set up live subscriptions via @supabase/supabase-js. ' +
      'Subscribe to these tables to receive INSERT/UPDATE/DELETE events in real time ' +
      'without polling — progress bars update instantly when a hire completes a task.',
  })
  @ApiOkResponse({ description: '200 — Realtime config returned', schema: realtimeConfigSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('realtime-config')
  getRealtimeConfig(@CompanyId() companyId: string) {
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://cfhrgvierfocpkkzergb.supabase.co',
      tables: ['hires', 'hire_tasks', 'documents', 'notifications'],
      channel: `hr-dashboard:${companyId}`,
      description:
        'Subscribe to these tables via Supabase Realtime for live dashboard updates. ' +
        'Use the Supabase JS client: supabase.channel(channel).on("postgres_changes", ...).subscribe()',
      events: {
        hires: ['UPDATE'],
        hire_tasks: ['INSERT', 'UPDATE'],
        documents: ['INSERT', 'UPDATE'],
        notifications: ['INSERT'],
      },
    };
  }

  // ── GET /analytics/export/hires ────────────────────────────────

  @ApiOperation({
    summary: 'Export all hires as CSV',
    description:
      'Downloads a CSV file with all hires including task counts, completion %, ' +
      'and overdue task count. Suitable for Excel / Google Sheets import.',
  })
  @ApiOkResponse({
    description: '200 — CSV file returned',
    schema: { type: 'string', example: 'ID,Full Name,Email,...' },
  })
  @RequirePermissions(Permission.EXPORT_ANALYTICS)
  @Get('export/hires')
  exportHiresCsv(
    @CompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const csv = this.analyticsService.exportHiresCsv(companyId);
    const filename = `hires-export-${new Date().toISOString().slice(0, 10)}.csv`;
    (res as any).setHeader('Content-Type', 'text/csv');
    (res as any).setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    (res as any).send(csv);
  }

  // ── GET /analytics/export/tasks ────────────────────────────────

  @ApiOperation({
    summary: 'Export all hire tasks as CSV',
    description:
      'Downloads a CSV file with every task across all hires — ' +
      'phase, type, status, due date, assigned role.',
  })
  @ApiOkResponse({
    description: '200 — CSV file returned',
    schema: { type: 'string', example: 'Hire ID,Hire Name,Task ID,...' },
  })
  @RequirePermissions(Permission.EXPORT_ANALYTICS)
  @Get('export/tasks')
  exportTasksCsv(
    @CompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const csv = this.analyticsService.exportTasksCsv(companyId);
    const filename = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    (res as any).setHeader('Content-Type', 'text/csv');
    (res as any).setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    (res as any).send(csv);
  }

  // ── GET /analytics/report/hire/:hireId ─────────────────────────

  @ApiOperation({
    summary: 'Per-hire summary report (JSON)',
    description:
      'Returns a structured JSON report for a single hire: ' +
      'task summary, phase breakdown, overdue tasks, and timeline. ' +
      'The frontend renders this as a printable PDF summary.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Hire summary report returned',
    schema: {
      type: 'object',
      properties: {
        generatedAt: { type: 'string', format: 'date-time' },
        hire: hireSchema,
        summary: {
          type: 'object',
          properties: {
            totalTasks: { type: 'number' },
            completedTasks: { type: 'number' },
            pendingTasks: { type: 'number' },
            overdueTaskCount: { type: 'number' },
            completionPct: { type: 'number' },
          },
        },
        phaseBreakdown: { type: 'array', items: phaseTimeRowSchema },
        overdueTasks: { type: 'array', items: overdueTaskRowSchema },
      },
    },
  })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('report/hire/:hireId')
  getHireSummaryReport(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
  ) {
    return this.analyticsService.getHireSummaryReport(companyId, hireId);
  }
}
