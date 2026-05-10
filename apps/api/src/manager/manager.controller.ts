import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { CompanyId } from '../common/decorators/company-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../workspace/workspace.types';
import {
  managerDashboardSchema,
  managerHireViewSchema,
  phaseApprovalSchema,
  managerNoteSchema,
  reuploadRequestSchema,
  approvePhaseBodySchema,
  finalApprovalBodySchema,
  createManagerNoteBodySchema,
  requestReuploadBodySchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { ManagerService } from './manager.service';
import { Phase } from '../templates/templates.types';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 401 }, message: { type: 'string', example: 'Unauthorized' } } },
};
const FORBIDDEN = {
  description: '403 — Insufficient permissions or not the assigned manager',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'You are not the assigned manager for this hire' } } },
};

@ApiTags('Manager Approval Workflow')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  // ── GET /manager/dashboard ─────────────────────────────────────

  @ApiOperation({
    summary: 'Manager dashboard — all direct reports in onboarding',
    description:
      'Returns all hires where the authenticated manager is the assigned manager. ' +
      'Each hire is enriched with phase approvals, private notes, overdue task count, ' +
      'and per-phase progress. Includes a summary breakdown by status.',
  })
  @ApiOkResponse({ description: '200 — Manager dashboard returned', schema: managerDashboardSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Get('dashboard')
  getDashboard(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managerService.getManagerDashboard(companyId, user.id);
  }

  // ── GET /manager/hires/:hireId ─────────────────────────────────

  @ApiOperation({
    summary: 'Get enriched hire detail for manager',
    description:
      'Returns the full hire record with tasks, phase approvals, private manager notes, ' +
      'pending re-upload requests, and phase-level progress. ' +
      'Returns 403 if the authenticated user is not the assigned manager.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({ description: '200 — Hire detail returned', schema: managerHireViewSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Get('hires/:hireId')
  getHireDetail(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managerService.getManagerHireView(companyId, hireId, user.id);
  }

  // ── POST /manager/hires/:hireId/approve-phase ──────────────────

  @ApiOperation({
    summary: 'Approve a phase of onboarding',
    description:
      'Manager signs off on a specific phase (pre_boarding, week_1, month_1, month_3). ' +
      'All required tasks in the phase must be completed before approval. ' +
      'Notifies HR admin. Returns 409 if the phase is already approved. ' +
      'Returns 400 if required tasks are still pending.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiBody({ schema: approvePhaseBodySchema })
  @ApiCreatedResponse({ description: '201 — Phase approved', schema: phaseApprovalSchema })
  @ApiBadRequestResponse({ description: '400 — Required tasks not yet completed or invalid phase', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Phase already approved', schema: conflictSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post('hires/:hireId/approve-phase')
  approvePhase(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.managerService.approvePhase(companyId, hireId, user.id, body);
  }

  // ── DELETE /manager/hires/:hireId/phases/:phase ────────────────

  @ApiOperation({
    summary: 'Revoke a phase approval',
    description:
      'Removes a previously granted phase approval. ' +
      'Useful if tasks are found to be incomplete after approval.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiParam({ name: 'phase', enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'], description: 'Phase to revoke' })
  @ApiOkResponse({ description: '200 — Phase approval revoked', schema: successSchema })
  @ApiNotFoundResponse({ description: '404 — Phase approval not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @HttpCode(HttpStatus.OK)
  @Delete('hires/:hireId/phases/:phase')
  revokePhaseApproval(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Param('phase') phase: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managerService.revokePhaseApproval(
      companyId,
      hireId,
      user.id,
      phase as Phase,
    );
  }

  // ── GET /manager/hires/:hireId/phases ──────────────────────────

  @ApiOperation({
    summary: 'List all phase approvals for a hire',
    description: 'Returns all phases that have been approved by the manager.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Phase approvals returned',
    schema: { type: 'object', properties: { approvals: { type: 'array', items: phaseApprovalSchema }, count: { type: 'number', example: 2 } } },
  })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Get('hires/:hireId/phases')
  listPhaseApprovals(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate manager owns this hire
    this.managerService.getManagerHireView(companyId, hireId, user.id);
    const approvals = this.managerService.listPhaseApprovals(hireId);
    return { approvals, count: approvals.length };
  }

  // ── POST /manager/hires/:hireId/final-approval ─────────────────

  @ApiOperation({
    summary: 'Give final onboarding approval',
    description:
      'Manager gives final sign-off on the entire onboarding journey. ' +
      'Marks the hire as "completed", notifies HR admin and the new hire. ' +
      'Returns 409 if already completed or cancelled.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiBody({ schema: finalApprovalBodySchema })
  @ApiOkResponse({ description: '200 — Final approval given, hire marked as completed', schema: managerHireViewSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Hire already completed or cancelled', schema: conflictSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post('hires/:hireId/final-approval')
  giveFinalApproval(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.managerService.giveFinaApproval(
      companyId,
      hireId,
      user.id,
      body?.note,
    );
  }

  // ── GET /manager/hires/:hireId/notes ───────────────────────────

  @ApiOperation({
    summary: 'List private manager notes for a hire',
    description:
      'Returns all private notes added by the manager. ' +
      'These notes are NOT visible to the new hire — manager-only.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Manager notes returned',
    schema: { type: 'object', properties: { notes: { type: 'array', items: managerNoteSchema }, count: { type: 'number', example: 2 } } },
  })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Get('hires/:hireId/notes')
  listNotes(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const notes = this.managerService.listManagerNotes(companyId, hireId, user.id);
    return { notes, count: notes.length };
  }

  // ── POST /manager/hires/:hireId/notes ──────────────────────────

  @ApiOperation({
    summary: 'Add a private manager note',
    description:
      'Creates a private note on a hire. Not visible to the new hire. ' +
      'Useful for recording observations, concerns, or recommendations.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiBody({ schema: createManagerNoteBodySchema })
  @ApiCreatedResponse({ description: '201 — Note created', schema: managerNoteSchema })
  @ApiBadRequestResponse({ description: '400 — body is required', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post('hires/:hireId/notes')
  createNote(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.managerService.createManagerNote(companyId, hireId, user.id, body);
  }

  // ── PATCH /manager/hires/:hireId/notes/:noteId ─────────────────

  @ApiOperation({ summary: 'Update a private manager note' })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiParam({ name: 'noteId', format: 'uuid', description: 'Note ID' })
  @ApiBody({ schema: createManagerNoteBodySchema })
  @ApiOkResponse({ description: '200 — Note updated', schema: managerNoteSchema })
  @ApiBadRequestResponse({ description: '400 — body is required', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Note not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Patch('hires/:hireId/notes/:noteId')
  updateNote(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.managerService.updateManagerNote(
      companyId,
      hireId,
      noteId,
      user.id,
      body,
    );
  }

  // ── DELETE /manager/hires/:hireId/notes/:noteId ────────────────

  @ApiOperation({ summary: 'Delete a private manager note' })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiParam({ name: 'noteId', format: 'uuid', description: 'Note ID' })
  @ApiOkResponse({ description: '200 — Note deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: '404 — Note not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @HttpCode(HttpStatus.OK)
  @Delete('hires/:hireId/notes/:noteId')
  deleteNote(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.managerService.deleteManagerNote(companyId, hireId, noteId, user.id);
    return { success: true };
  }

  // ── GET /manager/hires/:hireId/reupload-requests ───────────────

  @ApiOperation({
    summary: 'List document re-upload requests for a hire',
    description: 'Returns all pending and historical re-upload requests the manager has raised.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Re-upload requests returned',
    schema: { type: 'object', properties: { requests: { type: 'array', items: reuploadRequestSchema }, count: { type: 'number', example: 1 } } },
  })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Get('hires/:hireId/reupload-requests')
  listReuploadRequests(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const requests = this.managerService.listReuploadRequests(
      companyId,
      hireId,
      user.id,
    );
    return { requests, count: requests.length };
  }

  // ── POST /manager/hires/:hireId/reupload-requests ──────────────

  @ApiOperation({
    summary: 'Request a document re-upload',
    description:
      'Manager requests the new hire to re-upload a specific document with a reason. ' +
      'Sends an in-app notification to the new hire. ' +
      'Returns 400 if reason is missing.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiBody({ schema: requestReuploadBodySchema })
  @ApiCreatedResponse({ description: '201 — Re-upload request created, hire notified', schema: reuploadRequestSchema })
  @ApiBadRequestResponse({ description: '400 — documentId and reason are required', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post('hires/:hireId/reupload-requests')
  requestReupload(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.managerService.requestDocumentReupload(
      companyId,
      hireId,
      user.id,
      body,
    );
  }

  // ── DELETE /manager/hires/:hireId/reupload-requests/:requestId ─

  @ApiOperation({
    summary: 'Cancel a document re-upload request',
    description: 'Cancels a pending re-upload request. Returns 409 if already fulfilled or cancelled.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiParam({ name: 'requestId', format: 'uuid', description: 'Re-upload request ID' })
  @ApiOkResponse({ description: '200 — Request cancelled', schema: reuploadRequestSchema })
  @ApiNotFoundResponse({ description: '404 — Request not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Request is not in pending state', schema: conflictSchema })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @HttpCode(HttpStatus.OK)
  @Delete('hires/:hireId/reupload-requests/:requestId')
  cancelReuploadRequest(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managerService.cancelReuploadRequest(
      companyId,
      hireId,
      requestId,
      user.id,
    );
  }
}
