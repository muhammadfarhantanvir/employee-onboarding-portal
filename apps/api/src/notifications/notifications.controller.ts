import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { CompanyId } from '../common/decorators/company-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../workspace/workspace.types';
import {
  notificationSchema,
  notificationListSchema,
  unreadCountSchema,
  markReadResponseSchema,
  workflowJobSchema,
  workflowJobListSchema,
  scheduleJobBodySchema,
  emailLogListSchema,
  triggerWorkflowBodySchema,
  schedulerStatusSchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { NotificationsService } from './notifications.service';
import { WorkflowService } from './workflow.service';
import { EmailService } from './email.service';
import { WorkflowJobType } from './notifications.types';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 401 }, message: { type: 'string', example: 'Unauthorized' } } },
};
const FORBIDDEN = {
  description: '403 — Insufficient permissions',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'Forbidden resource' } } },
};

@ApiTags('Notifications & Workflow')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(CompanyGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly workflowService: WorkflowService,
    private readonly emailService: EmailService,
  ) {}

  // ── GET /notifications ─────────────────────────────────────────

  @ApiOperation({
    summary: 'Get my notifications',
    description:
      'Returns notifications for the authenticated user, newest first. ' +
      'Optionally filter by unread-only or notification type.',
  })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by notification type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 50)' })
  @ApiOkResponse({ description: '200 — Notifications returned', schema: notificationListSchema })
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listForUser(user.id, {
      unreadOnly: unreadOnly === 'true',
      type,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // ── GET /notifications/unread-count ───────────────────────────

  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the count of unread notifications for the badge indicator.',
  })
  @ApiOkResponse({ description: '200 — Unread count returned', schema: unreadCountSchema })
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: this.notificationsService.getUnreadCount(user.id) };
  }

  // ── PATCH /notifications/read-all ─────────────────────────────

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks every unread notification for the current user as read.',
  })
  @ApiOkResponse({ description: '200 — All notifications marked as read', schema: markReadResponseSchema })
  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  // ── PATCH /notifications/:id/read ─────────────────────────────

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Notification ID' })
  @ApiOkResponse({ description: '200 — Notification marked as read', schema: notificationSchema })
  @ApiNotFoundResponse({ description: '404 — Notification not found', schema: notFoundSchema })
  @Patch(':id/read')
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  // ── DELETE /notifications/:id ──────────────────────────────────

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Notification ID' })
  @ApiOkResponse({ description: '200 — Notification deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: '404 — Notification not found', schema: notFoundSchema })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    this.notificationsService.deleteNotification(user.id, id);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKFLOW JOBS
  // ═══════════════════════════════════════════════════════════════

  // ── GET /notifications/jobs ────────────────────────────────────

  @ApiOperation({
    summary: 'List workflow jobs',
    description:
      'Returns all scheduled and historical workflow jobs for the company. ' +
      'Filter by status or type. HR admin only.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by job type' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: '200 — Workflow jobs returned', schema: workflowJobListSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Get('jobs')
  listJobs(
    @CompanyId() companyId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listJobs(companyId, {
      status,
      type,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  // ── POST /notifications/jobs ───────────────────────────────────

  @ApiOperation({
    summary: 'Schedule a workflow job manually',
    description:
      'Manually enqueue a workflow job for future execution. ' +
      'Useful for testing or one-off reminders. HR admin only.',
  })
  @ApiBody({ schema: scheduleJobBodySchema })
  @ApiCreatedResponse({ description: '201 — Job scheduled', schema: workflowJobSchema })
  @ApiBadRequestResponse({ description: '400 — Invalid job type or scheduledAt', schema: errorSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('jobs')
  scheduleJob(
    @CompanyId() companyId: string,
    @Body() body: any,
  ) {
    const scheduledAt = new Date(body?.scheduledAt ?? Date.now());
    if (isNaN(scheduledAt.getTime())) {
      throw new Error('scheduledAt must be a valid ISO date-time string');
    }
    return this.notificationsService.scheduleJob(
      companyId,
      body?.type as WorkflowJobType,
      body?.payload ?? {},
      scheduledAt,
    );
  }

  // ── PATCH /notifications/jobs/:id/cancel ──────────────────────

  @ApiOperation({
    summary: 'Cancel a pending workflow job',
    description: 'Cancels a pending job. Cannot cancel running or completed jobs.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Job ID' })
  @ApiOkResponse({ description: '200 — Job cancelled', schema: workflowJobSchema })
  @ApiBadRequestResponse({ description: '400 — Job is running or already completed', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Job not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Patch('jobs/:id/cancel')
  cancelJob(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.notificationsService.cancelJob(companyId, id);
  }

  // ── PATCH /notifications/jobs/:id/retry ───────────────────────

  @ApiOperation({
    summary: 'Retry a failed workflow job',
    description: 'Re-queues a failed job for immediate execution.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Job ID' })
  @ApiOkResponse({ description: '200 — Job re-queued', schema: workflowJobSchema })
  @ApiBadRequestResponse({ description: '400 — Job is not in failed state', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Job not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Patch('jobs/:id/retry')
  retryJob(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.notificationsService.retryJob(companyId, id);
  }

  // ── POST /notifications/jobs/tick ─────────────────────────────

  @ApiOperation({
    summary: 'Manually trigger the scheduler tick',
    description:
      'Processes all due workflow jobs immediately. ' +
      'Normally runs automatically every 60 seconds. ' +
      'Useful for testing and development.',
  })
  @ApiOkResponse({
    description: '200 — Tick completed',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number', example: 2 },
        failed: { type: 'number', example: 0 },
      },
    },
  })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('jobs/tick')
  async triggerTick(@CompanyId() companyId: string) {
    return this.workflowService.processDueJobs(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKFLOW EVENT TRIGGERS (for testing / manual dispatch)
  // ═══════════════════════════════════════════════════════════════

  // ── POST /notifications/trigger ───────────────────────────────

  @ApiOperation({
    summary: 'Manually trigger a workflow event',
    description:
      'Fires a workflow event with a custom payload. ' +
      'Used for testing the notification and email pipeline without waiting for real events. ' +
      'HR admin only.',
  })
  @ApiBody({ schema: triggerWorkflowBodySchema })
  @ApiCreatedResponse({
    description: '201 — Event triggered, notifications and emails dispatched',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        event: { type: 'string', example: 'hire_created' },
        notificationsCreated: { type: 'number', example: 2 },
        jobsScheduled: { type: 'number', example: 2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: '400 — Unknown event type', schema: errorSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('trigger')
  async triggerEvent(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const event = body?.event as string;
    const payload = body?.payload ?? {};

    const demoContext = {
      hrAdminId: user.id,
      hrAdminEmail: user.email,
      hrAdminName: user.fullName,
      companyName: 'Demo Company',
    };

    switch (event) {
      case 'hire_created':
        await this.workflowService.onHireCreated(
          {
            hireId: payload.hireId ?? 'demo-hire-id',
            companyId,
            hireEmail: payload.hireEmail ?? 'newhire@demo-company.com',
            hireFullName: payload.hireFullName ?? 'Demo Hire',
            managerId: payload.managerId ?? null,
            startDate: payload.startDate ?? new Date().toISOString().slice(0, 10),
          },
          demoContext,
        );
        break;

      case 'hire_completed':
        await this.workflowService.onHireCompleted(
          {
            hireId: payload.hireId ?? 'demo-hire-id',
            companyId,
            hireEmail: payload.hireEmail ?? 'newhire@demo-company.com',
            hireFullName: payload.hireFullName ?? 'Demo Hire',
            managerId: null,
            startDate: payload.startDate ?? new Date().toISOString().slice(0, 10),
          },
          { companyName: 'Demo Company' },
        );
        break;

      case 'hire_at_risk':
        await this.workflowService.onHireAtRisk(
          {
            hireId: payload.hireId ?? 'demo-hire-id',
            companyId,
            hireEmail: payload.hireEmail ?? 'newhire@demo-company.com',
            hireFullName: payload.hireFullName ?? 'Demo Hire',
            managerId: null,
            startDate: payload.startDate ?? new Date().toISOString().slice(0, 10),
          },
          { ...demoContext, overdueCount: payload.overdueCount ?? 1 },
        );
        break;

      case 'doc_uploaded':
        await this.workflowService.onDocumentUploaded(
          {
            documentId: payload.documentId ?? 'demo-doc-id',
            companyId,
            hireId: payload.hireId ?? null,
            documentName: payload.documentName ?? 'Demo Document.pdf',
            uploadedBy: payload.uploadedBy ?? null,
          },
          { ...demoContext, hireName: payload.hireName ?? 'Demo Hire' },
        );
        break;

      default:
        throw new Error(`Unknown workflow event: "${event}"`);
    }

    return {
      success: true,
      event,
      notificationsCreated: 1,
      jobsScheduled: event === 'hire_created' ? 2 : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EMAIL LOG
  // ═══════════════════════════════════════════════════════════════

  // ── GET /notifications/email-log ──────────────────────────────

  @ApiOperation({
    summary: 'Get email delivery log',
    description:
      'Returns the audit log of all transactional emails sent for this company. ' +
      'Includes delivery status, provider ID, and error details for failed sends. ' +
      'HR admin only.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 50)' })
  @ApiOkResponse({ description: '200 — Email log returned', schema: emailLogListSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Get('email-log')
  getEmailLog(
    @CompanyId() companyId: string,
    @Query('limit') limit?: string,
  ) {
    const emails = this.emailService.getEmailLog(
      companyId,
      limit ? parseInt(limit, 10) : 50,
    );
    const byStatus = this.emailService.getEmailLogStats(companyId);
    return { emails, count: emails.length, byStatus };
  }
}
