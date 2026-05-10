import { Controller, Get, Query, UseGuards, Res, Param } from '@nestjs/common';
import { Response } from 'express';
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
@UseGuards(CompanyGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'KPI overview — top-level dashboard metrics' })
  @ApiOkResponse({ description: '200 — Overview metrics returned', schema: analyticsOverviewSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('overview')
  getOverview(@CompanyId() companyId: string) {
    return this.analyticsService.getOverview(companyId);
  }

  @ApiOperation({ summary: 'Active onboardings table' })
  @ApiOkResponse({ description: '200 — Active hires returned', schema: activeHiresResponseSchema })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get('active-hires')
  getActiveHires(@CompanyId() companyId: string) {
    return this.analyticsService.getActiveHires(companyId);
  }

  @ApiOperation({ summary: 'Completion rate by department' })
  @ApiOkResponse({ description: '200 — Department breakdown returned', schema: { type: 'array', items: departmentCompletionSchema } })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('completion-by-department')
  getCompletionByDepartment(@CompanyId() companyId: string) {
    return this.analyticsService.getCompletionByDepartment(companyId);
  }

  @ApiOperation({ summary: 'Average time to complete by phase' })
  @ApiOkResponse({ description: '200 — Phase time metrics returned', schema: { type: 'array', items: phaseTimeRowSchema } })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('phase-time')
  getPhaseTime(@CompanyId() companyId: string) {
    return this.analyticsService.getPhaseTimeMetrics(companyId);
  }

  @ApiOperation({ summary: 'All overdue required tasks across active hires' })
  @ApiOkResponse({ description: '200 — Overdue tasks returned', schema: overdueTasksResponseSchema })
  @RequirePermissions(Permission.VIEW_ALL_TASKS)
  @Get('overdue-tasks')
  getOverdueTasks(@CompanyId() companyId: string) {
    return this.analyticsService.getOverdueTasks(companyId);
  }

  @ApiOperation({ summary: 'Document review queue — pending HR review' })
  @ApiOkResponse({ description: '200 — Document review queue returned', schema: documentReviewQueueSchema })
  @RequirePermissions(Permission.REVIEW_DOCUMENTS)
  @Get('document-review-queue')
  getDocumentReviewQueue(@CompanyId() companyId: string) {
    return this.analyticsService.getDocumentReviewQueue(companyId);
  }

  @ApiOperation({ summary: 'Monthly hire cohort chart data' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiOkResponse({ description: '200 — Cohort data returned', schema: { type: 'array', items: hireCohortPointSchema } })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('hire-cohort')
  getHireCohort(@CompanyId() companyId: string, @Query('months') months?: string) {
    const m = months ? Math.min(parseInt(months, 10), 24) : 6;
    return this.analyticsService.getHireCohort(companyId, m);
  }

  @ApiOperation({ summary: 'Supabase Realtime subscription config' })
  @ApiOkResponse({ description: '200 — Realtime config returned', schema: realtimeConfigSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('realtime-config')
  getRealtimeConfig(@CompanyId() companyId: string) {
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://cfhrgvierfocpkkzergb.supabase.co',
      tables: ['hires', 'hire_tasks', 'documents', 'notifications'],
      channel: `hr-dashboard:${companyId}`,
      description: 'Subscribe via Supabase Realtime for live dashboard updates.',
      events: { hires: ['UPDATE'], hire_tasks: ['INSERT', 'UPDATE'], documents: ['INSERT', 'UPDATE'], notifications: ['INSERT'] },
    };
  }

  @ApiOperation({ summary: 'Export all hires as CSV' })
  @ApiOkResponse({ description: '200 — CSV file returned', schema: { type: 'string' } })
  @RequirePermissions(Permission.EXPORT_ANALYTICS)
  @Get('export/hires')
  exportHiresCsv(@CompanyId() companyId: string, @Res() res: Response) {
    const csv = this.analyticsService.exportHiresCsv(companyId);
    const filename = `hires-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @ApiOperation({ summary: 'Export all hire tasks as CSV' })
  @ApiOkResponse({ description: '200 — CSV file returned', schema: { type: 'string' } })
  @RequirePermissions(Permission.EXPORT_ANALYTICS)
  @Get('export/tasks')
  exportTasksCsv(@CompanyId() companyId: string, @Res() res: Response) {
    const csv = this.analyticsService.exportTasksCsv(companyId);
    const filename = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @ApiOperation({ summary: 'Per-hire summary report (JSON)' })
  @ApiParam({ name: 'hireId', format: 'uuid' })
  @ApiOkResponse({
    description: '200 — Hire summary report returned',
    schema: { type: 'object', properties: { generatedAt: { type: 'string', format: 'date-time' }, hire: hireSchema, summary: { type: 'object' }, phaseBreakdown: { type: 'array', items: phaseTimeRowSchema }, overdueTasks: { type: 'array', items: overdueTaskRowSchema } } },
  })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('report/hire/:hireId')
  getHireSummaryReport(@CompanyId() companyId: string, @Param('hireId') hireId: string) {
    return this.analyticsService.getHireSummaryReport(companyId, hireId);
  }
}
