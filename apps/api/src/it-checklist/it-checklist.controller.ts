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
  itChecklistTemplateSchema,
  itChecklistTemplateItemSchema,
  itChecklistSchema,
  itChecklistItemSchema,
  itChecklistListSchema,
  createItTemplateBodySchema,
  updateItTemplateBodySchema,
  createItTemplateItemBodySchema,
  updateItTemplateItemBodySchema,
  reorderItItemsBodySchema,
  createItChecklistBodySchema,
  updateItChecklistBodySchema,
  updateItChecklistItemBodySchema,
  completeItItemBodySchema,
  blockItItemBodySchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { ItChecklistService } from './it-checklist.service';

const UNAUTHORIZED = {
  description: '401 — Missing or invalid bearer token',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 401 }, message: { type: 'string', example: 'Unauthorized' } } },
};
const FORBIDDEN = {
  description: '403 — Insufficient permissions',
  schema: { type: 'object', properties: { statusCode: { type: 'number', example: 403 }, message: { type: 'string', example: 'Forbidden resource' } } },
};

@ApiTags('IT Checklists')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse(UNAUTHORIZED)
@ApiForbiddenResponse(FORBIDDEN)
@ApiTooManyRequestsResponse({ description: '429 — Rate limit exceeded', schema: tooManyRequestsSchema })
@ApiInternalServerErrorResponse({ description: '500 — Unexpected server error', schema: internalErrorSchema })
@UseGuards(CompanyGuard)
@Controller('it-checklists')
export class ItChecklistController {
  constructor(private readonly service: ItChecklistService) {}

  // ═══════════════════════════════════════════════════════════════
  // IT CHECKLIST TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({
    summary: 'List IT checklist templates',
    description: 'Returns all IT provisioning templates for the company, sorted by name.',
  })
  @ApiOkResponse({
    description: '200 — Templates returned',
    schema: { type: 'object', properties: { templates: { type: 'array', items: itChecklistTemplateSchema }, count: { type: 'number', example: 2 } } },
  })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Get('templates')
  listTemplates(@CompanyId() companyId: string) {
    return this.service.listTemplates(companyId);
  }

  @ApiOperation({ summary: 'Get a single IT checklist template with all items' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiOkResponse({ description: '200 — Template found', schema: itChecklistTemplateSchema })
  @ApiNotFoundResponse({ description: '404 — Template not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Get('templates/:id')
  getTemplate(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.service.getTemplate(companyId, id);
  }

  @ApiOperation({
    summary: 'Create an IT checklist template',
    description: 'Creates an empty template. Add items via POST /it-checklists/templates/:id/items.',
  })
  @ApiBody({ schema: createItTemplateBodySchema })
  @ApiCreatedResponse({ description: '201 — Template created', schema: itChecklistTemplateSchema })
  @ApiBadRequestResponse({ description: '400 — name is required', schema: errorSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('templates')
  createTemplate(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.service.createTemplate(companyId, body, user.id);
  }

  @ApiOperation({ summary: 'Update IT checklist template metadata' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: updateItTemplateBodySchema })
  @ApiOkResponse({ description: '200 — Template updated', schema: itChecklistTemplateSchema })
  @ApiBadRequestResponse({ description: '400 — Validation error', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Template not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Patch('templates/:id')
  updateTemplate(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateTemplate(companyId, id, body);
  }

  @ApiOperation({ summary: 'Delete an IT checklist template' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiOkResponse({ description: '200 — Template deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: '404 — Template not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @HttpCode(HttpStatus.OK)
  @Delete('templates/:id')
  deleteTemplate(@CompanyId() companyId: string, @Param('id') id: string) {
    this.service.deleteTemplate(companyId, id);
    return { success: true };
  }

  // ── Template Items ─────────────────────────────────────────────

  @ApiOperation({ summary: 'Add an item to an IT checklist template' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: createItTemplateItemBodySchema })
  @ApiCreatedResponse({ description: '201 — Item added', schema: itChecklistTemplateItemSchema })
  @ApiBadRequestResponse({ description: '400 — title is required or invalid category', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Template not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('templates/:id/items')
  addTemplateItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.addTemplateItem(companyId, id, body);
  }

  @ApiOperation({ summary: 'Update a template item' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Item ID' })
  @ApiBody({ schema: updateItTemplateItemBodySchema })
  @ApiOkResponse({ description: '200 — Item updated', schema: itChecklistTemplateItemSchema })
  @ApiBadRequestResponse({ description: '400 — Validation error', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Template or item not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Patch('templates/:id/items/:itemId')
  updateTemplateItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.service.updateTemplateItem(companyId, id, itemId, body);
  }

  @ApiOperation({ summary: 'Delete a template item' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Item ID' })
  @ApiOkResponse({ description: '200 — Item deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: '404 — Template or item not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @HttpCode(HttpStatus.OK)
  @Delete('templates/:id/items/:itemId')
  deleteTemplateItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    this.service.deleteTemplateItem(companyId, id, itemId);
    return { success: true };
  }

  @ApiOperation({
    summary: 'Reorder template items',
    description: 'Accepts an ordered array of ALL item IDs. Persists new sort order.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: reorderItItemsBodySchema })
  @ApiOkResponse({ description: '200 — Items reordered', schema: itChecklistTemplateSchema })
  @ApiBadRequestResponse({ description: '400 — itemIds array is incomplete or contains unknown IDs', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Template not found', schema: notFoundSchema })
  @RequirePermissions(Permission.MANAGE_COMPANY_SETTINGS)
  @Post('templates/:id/items/reorder')
  reorderTemplateItems(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.reorderTemplateItems(companyId, id, body?.itemIds ?? []);
  }

  // ═══════════════════════════════════════════════════════════════
  // IT CHECKLISTS (per hire)
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({
    summary: 'List all IT checklists',
    description:
      'Returns all IT checklists for the company. ' +
      'IT admins see only their assigned checklists via GET /it-checklists/mine.',
  })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned IT admin user ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in_progress', 'completed', 'blocked'] })
  @ApiOkResponse({ description: '200 — Checklists returned', schema: itChecklistListSchema })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get()
  listChecklists(
    @CompanyId() companyId: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listChecklists(companyId, { assignedTo, status });
  }

  @ApiOperation({
    summary: 'Get my assigned IT checklists',
    description: 'Returns all IT checklists assigned to the authenticated IT admin.',
  })
  @ApiOkResponse({ description: '200 — My checklists returned', schema: itChecklistListSchema })
  @Get('mine')
  getMyChecklists(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getMyChecklists(companyId, user.id);
  }

  @ApiOperation({
    summary: 'Get IT checklist for a specific hire',
    description: 'Returns the full IT checklist for a hire including all items, asset tags, and serial numbers.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({ description: '200 — Checklist found', schema: itChecklistSchema })
  @ApiNotFoundResponse({ description: '404 — No IT checklist found for this hire', schema: notFoundSchema })
  @Get('hire/:hireId')
  getChecklistByHire(@CompanyId() companyId: string, @Param('hireId') hireId: string) {
    return this.service.getChecklistByHire(companyId, hireId);
  }

  @ApiOperation({ summary: 'Get an IT checklist by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiOkResponse({ description: '200 — Checklist found', schema: itChecklistSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist not found', schema: notFoundSchema })
  @Get(':id')
  getChecklist(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.service.getChecklist(companyId, id);
  }

  @ApiOperation({
    summary: 'Create an IT checklist for a hire',
    description:
      'Creates an IT checklist for a hire, optionally instantiating items from a template. ' +
      'Only one checklist per hire is allowed. ' +
      'Returns 409 if a checklist already exists for this hire.',
  })
  @ApiBody({ schema: createItChecklistBodySchema })
  @ApiCreatedResponse({ description: '201 — Checklist created', schema: itChecklistSchema })
  @ApiBadRequestResponse({ description: '400 — hireId is required', schema: errorSchema })
  @ApiConflictResponse({ description: '409 — IT checklist already exists for this hire', schema: conflictSchema })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post()
  createChecklist(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.service.createChecklist(companyId, body, user.id);
  }

  @ApiOperation({
    summary: 'Update IT checklist metadata',
    description: 'Update assignment, due date, notes, or overall status.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiBody({ schema: updateItChecklistBodySchema })
  @ApiOkResponse({ description: '200 — Checklist updated', schema: itChecklistSchema })
  @ApiBadRequestResponse({ description: '400 — Invalid status value', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist not found', schema: notFoundSchema })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Patch(':id')
  updateChecklist(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateChecklist(companyId, id, body);
  }

  // ── Checklist Items ────────────────────────────────────────────

  @ApiOperation({
    summary: 'Add an ad-hoc item to a checklist',
    description: 'Adds a custom item to an existing checklist (not from template).',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiBody({ schema: createItTemplateItemBodySchema })
  @ApiCreatedResponse({ description: '201 — Item added', schema: itChecklistItemSchema })
  @ApiBadRequestResponse({ description: '400 — title is required', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist not found', schema: notFoundSchema })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Post(':id/items')
  addChecklistItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.addChecklistItem(companyId, id, body);
  }

  @ApiOperation({
    summary: 'Update a checklist item',
    description:
      'General-purpose update for status, note, asset tag, and serial number. ' +
      'Completion percentage on the parent checklist is recalculated automatically.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Item ID' })
  @ApiBody({ schema: updateItChecklistItemBodySchema })
  @ApiOkResponse({ description: '200 — Item updated', schema: itChecklistItemSchema })
  @ApiBadRequestResponse({ description: '400 — Invalid status value', schema: errorSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist or item not found', schema: notFoundSchema })
  @Patch(':id/items/:itemId')
  updateChecklistItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.service.updateChecklistItem(companyId, id, itemId, body, user.id);
  }

  @ApiOperation({
    summary: 'Mark a checklist item as complete',
    description:
      'Sets item status to "completed" and records completedBy + completedAt. ' +
      'Optionally records asset tag and serial number for hardware items. ' +
      'Completion percentage on the parent checklist is recalculated. ' +
      'Returns 409 if already completed.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Item ID' })
  @ApiBody({ schema: completeItItemBodySchema })
  @ApiOkResponse({ description: '200 — Item completed', schema: itChecklistItemSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist or item not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Item is already completed', schema: conflictSchema })
  @Patch(':id/items/:itemId/complete')
  completeChecklistItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.service.completeChecklistItem(companyId, id, itemId, user.id, {
      note: body?.note,
      assetTag: body?.assetTag,
      serialNumber: body?.serialNumber,
    });
  }

  @ApiOperation({
    summary: 'Mark a checklist item as blocked',
    description:
      'Sets item status to "blocked" and marks the parent checklist as blocked. ' +
      'Provide a note explaining the blocker. ' +
      'Returns 409 if the item is already completed.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Checklist ID' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Item ID' })
  @ApiBody({ schema: blockItItemBodySchema })
  @ApiOkResponse({ description: '200 — Item blocked', schema: itChecklistItemSchema })
  @ApiNotFoundResponse({ description: '404 — Checklist or item not found', schema: notFoundSchema })
  @ApiConflictResponse({ description: '409 — Cannot block a completed item', schema: conflictSchema })
  @Patch(':id/items/:itemId/block')
  blockChecklistItem(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.service.blockChecklistItem(companyId, id, itemId, body?.note);
  }
}
