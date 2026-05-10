import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
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
import { AuthenticatedRequest } from '../common/http.types';
import {
  dataAccessLogEntrySchema,
  dataAccessLogListSchema,
  erasureRequestSchema,
  createErasureRequestBodySchema,
  processErasureBodySchema,
  privacyPolicySchema,
  createPrivacyPolicyBodySchema,
  privacyPolicyAckSchema,
  dataExportSchema,
  anonymisationResultSchema,
  expiredDocumentsSchema,
  logAccessBodySchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { GdprService } from './gdpr.service';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 401 }, message: { type: 'string', example: 'Unauthorized' } } },
};
const FORBIDDEN = {
  description: '403 — Insufficient permissions',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'Forbidden resource' } } },
};

@ApiTags('GDPR Compliance')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  // ── GET /gdpr/access-log ───────────────────────────────────────

  @ApiOperation({
    summary: 'Data access log',
    description:
      'Returns the audit trail of all data access events — document views, downloads, ' +
      'hire exports, and anonymisations. ' +
      'Implements GDPR Article 30 — Records of Processing Activities. ' +
      'HR admin only.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (document, hire)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 100)' })
  @ApiOkResponse({ description: '200 — Access log returned', schema: dataAccessLogListSchema })
  @RequirePermissions(Permission.VIEW_DATA_ACCESS_LOG)
  @Get('access-log')
  getAccessLog(
    @CompanyId() companyId: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gdprService.getAccessLog(companyId, {
      userId,
      entityType,
      action,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  // ── POST /gdpr/access-log ──────────────────────────────────────

  @ApiOperation({
    summary: 'Log a data access event',
    description:
      'Records a data access event in the audit log. ' +
      'Called by the frontend when a user views or downloads a document.',
  })
  @ApiBody({ schema: logAccessBodySchema })
  @ApiCreatedResponse({ description: '201 — Access event logged', schema: dataAccessLogEntrySchema })
  @ApiBadRequestResponse({ description: '400 — Invalid action or entityType', schema: errorSchema })
  @Post('access-log')
  logAccess(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.gdprService.logAccess(companyId, {
      userId: user.id,
      action: body?.action,
      entityType: body?.entityType,
      entityId: body?.entityId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
      metadata: body?.metadata,
    });
  }

  // ── GET /gdpr/export/hire/:hireId ──────────────────────────────

  @ApiOperation({
    summary: 'Export all personal data for a hire (GDPR Art. 15)',
    description:
      'Returns a complete JSON package of all personal data held for a hire: ' +
      'hire record, tasks, documents, and access log. ' +
      'Implements GDPR Article 15 — Right of Access. ' +
      'The export is logged in the data access audit trail.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({ description: '200 — Data export package returned', schema: dataExportSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Get('export/hire/:hireId')
  exportHireData(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
  ) {
    return this.gdprService.exportHireData(companyId, hireId);
  }

  // ── POST /gdpr/anonymise/hire/:hireId ──────────────────────────

  @ApiOperation({
    summary: 'Anonymise a hire record (GDPR Art. 17)',
    description:
      'Replaces all PII fields with anonymised placeholders and deletes associated documents. ' +
      'Implements GDPR Article 17 — Right to Erasure (Right to be Forgotten). ' +
      'This action is irreversible. The hire record is retained for audit purposes ' +
      'but all identifying information is removed.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({ description: '200 — Hire anonymised successfully', schema: anonymisationResultSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @HttpCode(HttpStatus.OK)
  @Post('anonymise/hire/:hireId')
  anonymiseHire(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gdprService.anonymiseHire(companyId, hireId, user.id);
  }

  // ── GET /gdpr/erasure-requests ─────────────────────────────────

  @ApiOperation({
    summary: 'List data erasure requests',
    description:
      'Returns all erasure requests submitted by employees or HR admins. ' +
      'HR admin only.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in_progress', 'completed', 'rejected'] })
  @ApiOkResponse({
    description: '200 — Erasure requests returned',
    schema: { type: 'object', properties: { requests: { type: 'array', items: erasureRequestSchema }, count: { type: 'number' } } },
  })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Get('erasure-requests')
  listErasureRequests(
    @CompanyId() companyId: string,
    @Query('status') status?: string,
  ) {
    return this.gdprService.listErasureRequests(companyId, status);
  }

  // ── POST /gdpr/erasure-requests ────────────────────────────────

  @ApiOperation({
    summary: 'Submit a data erasure request (GDPR Art. 17)',
    description:
      'Submits a request to erase personal data for a hire. ' +
      'New hires can submit for their own data; HR admins can submit for any hire. ' +
      'The request is reviewed and processed by an HR admin.',
  })
  @ApiBody({ schema: createErasureRequestBodySchema })
  @ApiCreatedResponse({ description: '201 — Erasure request submitted', schema: erasureRequestSchema })
  @ApiBadRequestResponse({ description: '400 — Validation error', schema: errorSchema })
  @RequirePermissions(Permission.REQUEST_DATA_ERASURE)
  @Post('erasure-requests')
  createErasureRequest(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.gdprService.createErasureRequest(companyId, user.id, body);
  }

  // ── PATCH /gdpr/erasure-requests/:id ──────────────────────────

  @ApiOperation({
    summary: 'Process an erasure request',
    description:
      'HR admin approves or rejects an erasure request. ' +
      'If status is set to "completed", the hire data is automatically anonymised.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Erasure request ID' })
  @ApiBody({ schema: processErasureBodySchema })
  @ApiOkResponse({ description: '200 — Request processed', schema: erasureRequestSchema })
  @ApiBadRequestResponse({ description: '400 — Invalid status or request already processed', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Request not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Patch('erasure-requests/:id')
  processErasureRequest(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.gdprService.processErasureRequest(companyId, id, user.id, body);
  }

  // ── GET /gdpr/retention/expired ────────────────────────────────

  @ApiOperation({
    summary: 'List documents past their retention date',
    description:
      'Returns all documents whose GDPR retention period has expired. ' +
      'HR admin should review and delete these to comply with data minimisation principles. ' +
      'Retention periods: contracts 7 years, policies 3 years, personal_id 1 year.',
  })
  @ApiOkResponse({ description: '200 — Expired documents returned', schema: expiredDocumentsSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Get('retention/expired')
  getExpiredDocuments(@CompanyId() companyId: string) {
    return this.gdprService.getExpiredDocuments(companyId);
  }

  // ── GET /gdpr/privacy-policy ───────────────────────────────────

  @ApiOperation({
    summary: 'List all privacy policy versions',
    description: 'Returns all privacy policy versions for the company, newest first.',
  })
  @ApiOkResponse({
    description: '200 — Privacy policies returned',
    schema: { type: 'object', properties: { policies: { type: 'array', items: privacyPolicySchema }, current: { ...privacyPolicySchema, nullable: true } } },
  })
  @Get('privacy-policy')
  listPolicies(@CompanyId() companyId: string) {
    const policies = this.gdprService.listPolicies(companyId);
    const current = this.gdprService.getCurrentPolicy(companyId);
    return { policies, current };
  }

  // ── POST /gdpr/privacy-policy ──────────────────────────────────

  @ApiOperation({
    summary: 'Publish a new privacy policy version',
    description:
      'Creates a new privacy policy version and marks it as current. ' +
      'All previous versions are automatically marked as not current. ' +
      'New hires will be required to acknowledge the new version.',
  })
  @ApiBody({ schema: createPrivacyPolicyBodySchema })
  @ApiCreatedResponse({ description: '201 — Privacy policy published', schema: privacyPolicySchema })
  @ApiBadRequestResponse({ description: '400 — version and effectiveAt are required', schema: errorSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Post('privacy-policy')
  createPolicy(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.gdprService.createPolicy(companyId, user.id, body);
  }

  // ── POST /gdpr/privacy-policy/:id/acknowledge ─────────────────

  @ApiOperation({
    summary: 'Acknowledge a privacy policy version',
    description:
      'Records that the authenticated user has read and acknowledged the privacy policy. ' +
      'Idempotent — calling again returns the existing acknowledgement. ' +
      'IP address is recorded for compliance.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Privacy policy version ID' })
  @ApiCreatedResponse({ description: '201 — Policy acknowledged', schema: privacyPolicyAckSchema })
  @ApiNotFoundResponse({ description: '404 — Policy not found', schema: notFoundSchema })
  @Post('privacy-policy/:id/acknowledge')
  acknowledgePolicy(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.gdprService.acknowledgePolicy(
      companyId,
      id,
      user.id,
      req.ip ?? undefined,
    );
  }

  // ── GET /gdpr/privacy-policy/:id/acknowledgements ─────────────

  @ApiOperation({
    summary: 'List acknowledgements for a privacy policy version',
    description:
      'Returns all users who have acknowledged this policy version, with timestamps. ' +
      'Used for compliance audit trails.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Privacy policy version ID' })
  @ApiOkResponse({
    description: '200 — Acknowledgements returned',
    schema: { type: 'object', properties: { acknowledgements: { type: 'array', items: privacyPolicyAckSchema }, count: { type: 'number' } } },
  })
  @ApiNotFoundResponse({ description: '404 — Policy not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_GDPR)
  @Get('privacy-policy/:id/acknowledgements')
  listPolicyAcknowledgements(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    const acks = this.gdprService.listPolicyAcknowledgements(companyId, id);
    return { acknowledgements: acks, count: acks.length };
  }
}
