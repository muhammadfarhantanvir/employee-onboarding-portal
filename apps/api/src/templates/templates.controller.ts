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
  onboardingTemplateSchema,
  templateTaskSchema,
  createTemplateBodySchema,
  updateTemplateBodySchema,
  createTemplateTaskBodySchema,
  updateTemplateTaskBodySchema,
  reorderTasksBodySchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { TemplatesService } from './templates.service';

@ApiTags('Onboarding Templates')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: '401 — Missing or invalid bearer token',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      message: { type: 'string', example: 'Unauthorized' },
    },
  },
})
@ApiForbiddenResponse({
  description: '403 — Insufficient permissions for this action',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 403 },
      message: { type: 'string', example: 'Forbidden resource' },
    },
  },
})
@ApiTooManyRequestsResponse({
  description: '429 — Rate limit exceeded',
  schema: tooManyRequestsSchema,
})
@ApiInternalServerErrorResponse({
  description: '500 — Unexpected server error',
  schema: internalErrorSchema,
})
@UseGuards(CompanyGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ── GET /templates ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'List all onboarding templates',
    description: 'Returns all templates for the company, sorted by name.',
  })
  @ApiOkResponse({
    description: '200 — Templates returned successfully',
    schema: {
      type: 'object',
      properties: {
        templates: { type: 'array', items: onboardingTemplateSchema },
        count: { type: 'number', example: 3 },
      },
    },
  })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get()
  findAll(@CompanyId() companyId: string) {
    const templates = this.templatesService.listTemplates(companyId);
    return { templates, count: templates.length };
  }

  // ── POST /templates ────────────────────────────────────────────

  @ApiOperation({
    summary: 'Create a new onboarding template',
    description: 'Creates an empty template. Add tasks via POST /templates/:id/tasks.',
  })
  @ApiBody({ schema: createTemplateBodySchema })
  @ApiCreatedResponse({
    description: '201 — Template created successfully',
    schema: onboardingTemplateSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — name is required or exceeds max length',
    schema: errorSchema,
  })
  @RequirePermissions(Permission.CREATE_ONBOARDING_PLANS)
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.templatesService.createTemplate(companyId, body, user.id);
  }

  // ── GET /templates/:id ─────────────────────────────────────────

  @ApiOperation({
    summary: 'Get a template with all its tasks',
    description: 'Returns the full template including all tasks sorted by phase and sortOrder.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiOkResponse({
    description: '200 — Template found',
    schema: onboardingTemplateSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.templatesService.getTemplate(companyId, id);
  }

  // ── PATCH /templates/:id ───────────────────────────────────────

  @ApiOperation({
    summary: 'Update template metadata',
    description: 'Updates name, description, or department. Does not affect tasks.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: updateTemplateBodySchema })
  @ApiOkResponse({
    description: '200 — Template updated',
    schema: onboardingTemplateSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Validation error',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.updateTemplate(companyId, id, body);
  }

  // ── DELETE /templates/:id ──────────────────────────────────────

  @ApiOperation({
    summary: 'Delete a template and all its tasks',
    description: 'Permanently removes the template. Existing hire tasks are not affected.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiOkResponse({
    description: '200 — Template deleted',
    schema: successSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.DELETE_ONBOARDING_PLANS)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    this.templatesService.deleteTemplate(companyId, id);
    return { success: true };
  }

  // ── POST /templates/:id/duplicate ─────────────────────────────

  @ApiOperation({
    summary: 'Duplicate a template',
    description:
      'Creates a full copy of the template and all its tasks. ' +
      'Useful for customising per hire or role variant.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Source template ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Software Engineer — Backend' },
        department: { type: 'string', example: 'Engineering' },
      },
    },
  })
  @ApiCreatedResponse({
    description: '201 — Duplicate template created',
    schema: onboardingTemplateSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Source template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.CREATE_ONBOARDING_PLANS)
  @Post(':id/duplicate')
  duplicate(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.templatesService.duplicateTemplate(companyId, id, user.id, body);
  }

  // ── POST /templates/:id/tasks ──────────────────────────────────

  @ApiOperation({
    summary: 'Add a task to a template',
    description: 'Appends a new task to the template. sortOrder is auto-assigned.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: createTemplateTaskBodySchema })
  @ApiCreatedResponse({
    description: '201 — Task added to template',
    schema: templateTaskSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — title, taskType, or phase is invalid',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Post(':id/tasks')
  addTask(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.addTask(companyId, id, body);
  }

  // ── PATCH /templates/:id/tasks/:taskId ─────────────────────────

  @ApiOperation({
    summary: 'Update a task within a template',
    description: 'Partial update — only provided fields are changed.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'taskId', format: 'uuid', description: 'Task ID' })
  @ApiBody({ schema: updateTemplateTaskBodySchema })
  @ApiOkResponse({
    description: '200 — Task updated',
    schema: templateTaskSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Invalid field value',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template or task not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Patch(':id/tasks/:taskId')
  updateTask(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: any,
  ) {
    return this.templatesService.updateTask(companyId, id, taskId, body);
  }

  // ── DELETE /templates/:id/tasks/:taskId ────────────────────────

  @ApiOperation({
    summary: 'Delete a task from a template',
    description: 'Permanently removes the task from the template.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'taskId', format: 'uuid', description: 'Task ID' })
  @ApiOkResponse({
    description: '200 — Task deleted',
    schema: successSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template or task not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/tasks/:taskId')
  deleteTask(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    this.templatesService.deleteTask(companyId, id, taskId);
    return { success: true };
  }

  // ── POST /templates/:id/tasks/reorder ──────────────────────────

  @ApiOperation({
    summary: 'Reorder tasks within a template',
    description:
      'Accepts an ordered array of ALL task IDs in the template. ' +
      'Used by the drag-and-drop UI to persist new sort order. ' +
      'Returns 400 if any task ID is missing or unknown.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiBody({ schema: reorderTasksBodySchema })
  @ApiOkResponse({
    description: '200 — Tasks reordered successfully',
    schema: onboardingTemplateSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — taskIds array is incomplete or contains unknown IDs',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Template not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Post(':id/tasks/reorder')
  reorderTasks(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.reorderTasks(companyId, id, body?.taskIds ?? []);
  }
}
