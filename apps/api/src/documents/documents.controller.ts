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
  Req,
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
import { AuthenticatedUser, Role } from '../workspace/workspace.types';
import { AuthenticatedRequest } from '../common/http.types';
import {
  documentSchema,
  documentListSchema,
  documentVersionsSchema,
  signedUrlSchema,
  acknowledgementSchema,
  acknowledgementResponseSchema,
  registerDocumentBodySchema,
  updateDocumentBodySchema,
  rejectDocumentBodySchema,
  acknowledgeDocumentBodySchema,
  deleteDocumentResponseSchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { DocumentsService } from './documents.service';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      message: { type: 'string', example: 'Unauthorized' },
    },
  },
};

const FORBIDDEN = {
  description: '403 — Insufficient permissions',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 403 },
      message: { type: 'string', example: 'Forbidden resource' },
    },
  },
};

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ── GET /documents/company ─────────────────────────────────────

  @ApiOperation({
    summary: 'List company-wide template documents',
    description:
      'Returns all documents uploaded by HR (handbooks, policies, NDA templates, etc.). ' +
      'Optionally filter by category or status.',
  })
  @ApiQuery({ name: 'category', required: false, enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending_review', 'approved', 'rejected', 'superseded'] })
  @ApiOkResponse({ description: '200 — Company documents returned', schema: documentListSchema })
  @RequirePermissions(Permission.MANAGE_DOCUMENTS)
  @Get('company')
  findCompanyDocs(
    @CompanyId() companyId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.documentsService.listCompanyDocuments(companyId, { category, status });
  }

  // ── GET /documents/pending-review ─────────────────────────────

  @ApiOperation({
    summary: 'List all documents pending HR review',
    description:
      'Returns all documents (company-wide and hire uploads) with status "pending_review", ' +
      'sorted oldest-first so the review queue is FIFO.',
  })
  @ApiOkResponse({ description: '200 — Pending review queue returned', schema: documentListSchema })
  @RequirePermissions(Permission.REVIEW_DOCUMENTS)
  @Get('pending-review')
  findPendingReview(@CompanyId() companyId: string) {
    return this.documentsService.listPendingReview(companyId);
  }

  // ── GET /documents/hire/:hireId ────────────────────────────────

  @ApiOperation({
    summary: "List a hire's documents",
    description:
      'Returns all documents uploaded for a specific hire. ' +
      'HR admins and managers can see all; new hires see only their own.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiQuery({ name: 'category', required: false, enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending_review', 'approved', 'rejected', 'superseded'] })
  @ApiOkResponse({ description: '200 — Hire documents returned', schema: documentListSchema })
  @ApiNotFoundResponse({ description: '404 — Hire not found', schema: notFoundSchema })
  @RequirePermissions(Permission.VIEW_ALL_DOCUMENTS)
  @Get('hire/:hireId')
  findByHire(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.documentsService.listHireDocuments(companyId, hireId, { category, status });
  }

  // ── GET /documents/:id ─────────────────────────────────────────

  @ApiOperation({
    summary: 'Get a single document by ID',
    description: 'Returns the full document record including review status, version, and GDPR metadata.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiOkResponse({ description: '200 — Document found', schema: documentSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.documentsService.getDocument(companyId, id);
  }

  // ── GET /documents/:id/url ─────────────────────────────────────

  @ApiOperation({
    summary: 'Get a signed download URL',
    description:
      'Generates a time-limited signed URL for secure document download. ' +
      'URL expires in 60 minutes. No direct public access to storage.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiQuery({ name: 'expiresIn', required: false, description: 'Expiry in seconds (default 3600)', example: 3600 })
  @ApiOkResponse({ description: '200 — Signed URL generated', schema: signedUrlSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @Get(':id/url')
  getSignedUrl(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const expiry = expiresIn ? Math.min(parseInt(expiresIn, 10), 86400) : 3600;
    return this.documentsService.getSignedUrl(companyId, id, user.id, expiry);
  }

  // ── GET /documents/:id/versions ────────────────────────────────

  @ApiOperation({
    summary: 'Get version history for a document',
    description:
      'Returns the current active version and the full history of superseded versions, ' +
      'ordered newest-first.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID (current version)' })
  @ApiOkResponse({ description: '200 — Version history returned', schema: documentVersionsSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @Get(':id/versions')
  getVersionHistory(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.documentsService.getVersionHistory(companyId, id);
  }

  // ── GET /documents/:id/acknowledgements ────────────────────────

  @ApiOperation({
    summary: 'List acknowledgements for a document',
    description:
      'Returns all users who have acknowledged this document, with timestamps. ' +
      'Used for compliance audit trails.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiOkResponse({
    description: '200 — Acknowledgements returned',
    schema: {
      type: 'object',
      properties: {
        acknowledgements: { type: 'array', items: acknowledgementSchema },
        count: { type: 'number', example: 3 },
      },
    },
  })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_DOCUMENTS)
  @Get(':id/acknowledgements')
  listAcknowledgements(@CompanyId() companyId: string, @Param('id') id: string) {
    const acks = this.documentsService.listAcknowledgements(companyId, id);
    return { acknowledgements: acks, count: acks.length };
  }

  // ── POST /documents ────────────────────────────────────────────

  @ApiOperation({
    summary: 'Register an uploaded document',
    description:
      'Called after the client uploads the file directly to Supabase Storage. ' +
      'Persists the document record with metadata. ' +
      'GDPR retention date is auto-calculated per category. ' +
      'Allowed MIME types: PDF, JPEG, PNG, WEBP, DOC, DOCX, XLS, XLSX, TXT, CSV.',
  })
  @ApiBody({ schema: registerDocumentBodySchema })
  @ApiCreatedResponse({ description: '201 — Document registered successfully', schema: documentSchema })
  @ApiBadRequestResponse({ description: '400 — Missing required fields or disallowed MIME type', schema: errorSchema })
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.documentsService.registerDocument(companyId, user.id, body);
  }

  // ── PATCH /documents/:id ───────────────────────────────────────

  @ApiOperation({
    summary: 'Update document metadata',
    description: 'Update the display name or category. Cannot update a superseded document.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiBody({ schema: updateDocumentBodySchema })
  @ApiOkResponse({ description: '200 — Document updated', schema: documentSchema })
  @ApiBadRequestResponse({ description: '400 — Validation error', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Cannot update a superseded document', schema: conflictSchema })
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.documentsService.updateDocument(companyId, id, body);
  }

  // ── POST /documents/:id/version ────────────────────────────────

  @ApiOperation({
    summary: 'Upload a new version of a document',
    description:
      'Creates a new document version. The previous version is automatically marked "superseded". ' +
      'The new version starts in "pending_review" status.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Current document ID to version' })
  @ApiBody({ schema: registerDocumentBodySchema })
  @ApiCreatedResponse({ description: '201 — New version created', schema: documentSchema })
  @ApiBadRequestResponse({ description: '400 — Validation error or disallowed MIME type', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Cannot version a superseded document', schema: conflictSchema })
  @Post(':id/version')
  uploadNewVersion(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.documentsService.uploadNewVersion(companyId, id, user.id, body);
  }

  // ── PATCH /documents/:id/approve ──────────────────────────────

  @ApiOperation({
    summary: 'Approve an uploaded document',
    description:
      'Marks the document as approved. ' +
      'Returns 409 if already approved or superseded.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiOkResponse({ description: '200 — Document approved', schema: documentSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Already approved or superseded', schema: conflictSchema })
  @RequirePermissions(Permission.REVIEW_DOCUMENTS)
  @Patch(':id/approve')
  approve(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.approveDocument(companyId, id, user.id);
  }

  // ── PATCH /documents/:id/reject ────────────────────────────────

  @ApiOperation({
    summary: 'Reject an uploaded document',
    description:
      'Marks the document as rejected with a mandatory reason. ' +
      'The new hire is expected to re-upload. ' +
      'Returns 400 if reason is missing, 409 if already rejected or superseded.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiBody({ schema: rejectDocumentBodySchema })
  @ApiOkResponse({ description: '200 — Document rejected', schema: documentSchema })
  @ApiBadRequestResponse({ description: '400 — reason is required', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Already rejected or superseded', schema: conflictSchema })
  @RequirePermissions(Permission.REVIEW_DOCUMENTS)
  @Patch(':id/reject')
  reject(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.documentsService.rejectDocument(companyId, id, user.id, body?.reason);
  }

  // ── POST /documents/:id/acknowledge ───────────────────────────

  @ApiOperation({
    summary: 'Acknowledge a document (e-sign)',
    description:
      'Records that the authenticated user has read and acknowledged the document. ' +
      'Idempotent — calling again returns the existing acknowledgement. ' +
      'Only approved documents can be acknowledged. ' +
      'Timestamp, IP address, and user-agent are recorded for compliance.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiBody({ schema: acknowledgeDocumentBodySchema })
  @ApiCreatedResponse({ description: '201 — Document acknowledged', schema: acknowledgementResponseSchema })
  @ApiBadRequestResponse({ description: '400 — Document is not yet approved', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @Post(':id/acknowledge')
  acknowledge(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.acknowledgeDocument(companyId, id, user.id, {
      hireId: body?.hireId,
      hireTaskId: body?.hireTaskId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
  }

  // ── DELETE /documents/:id ──────────────────────────────────────

  @ApiOperation({
    summary: 'Delete a document (GDPR erasure)',
    description:
      'Permanently deletes the document record. ' +
      'HR admins can delete any document. ' +
      'New hires can only delete their own pending documents. ' +
      'Approved documents require HR admin role. ' +
      'In production, also deletes the file from Supabase Storage.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Document ID' })
  @ApiOkResponse({ description: '200 — Document deleted', schema: deleteDocumentResponseSchema })
  @ApiNotFoundResponse({ description: '404 — Document not found', schema: notFoundSchema })
  @ApiForbiddenResponse({ description: '403 — Not authorised to delete this document', schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'Approved documents can only be deleted by HR admins' } } } })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isHrAdmin = user.role === Role.HR_ADMIN;
    return this.documentsService.deleteDocument(companyId, id, user.id, isHrAdmin);
  }
}
