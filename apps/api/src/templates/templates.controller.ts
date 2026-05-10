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
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
} from '../common/swagger.schemas';
import { TemplatesService } from './templates.service';

@ApiTags('Onboarding Templates')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ── Templates ──────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all onboarding templates for the company' })
  @ApiOkResponse({
    description: 'List of templates returned successfully',
    schema: {
      type: 'object',
      properties: {
        templates: { type: 'array', items: onboardingTemplateSchema },
        count: { type: 'number' },
      },
    },
  })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get()
  findAll(@CompanyId() companyId: string) {
    const templates = this.templatesService.listTemplates(companyId);
    return { templates, count: templates.length };
  }

  @ApiOperation({ summary: 'Create a new onboarding template' })
  @ApiCreatedResponse({
    description: 'Template created successfully',
    schema: onboardingTemplateSchema,
  })
  @ApiBody({ schema: createTemplateBodySchema })
  @RequirePermissions(Permission.CREATE_ONBOARDING_PLANS)
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.templatesService.createTemplate(companyId, body, user.id);
  }

  @ApiOperation({ summary: 'Get a template with all its tasks' })
  @ApiOkResponse({ description: 'Template found', schema: onboardingTemplateSchema })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.templatesService.getTemplate(companyId, id);
  }

  @ApiOperation({ summary: 'Update template metadata (name, description, department)' })
  @ApiOkResponse({ description: 'Template updated', schema: onboardingTemplateSchema })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiBody({ schema: updateTemplateBodySchema })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.updateTemplate(companyId, id, body);
  }

  @ApiOperation({ summary: 'Delete a template and all its tasks' })
  @ApiOkResponse({ description: 'Template deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.DELETE_ONBOARDING_PLANS)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    this.templatesService.deleteTemplate(companyId, id);
    return { success: true };
  }

  @ApiOperation({
    summary: 'Duplicate a template',
    description:
      'Creates a full copy of the template and all its tasks. Useful for customising per hire or role variant.',
  })
  @ApiCreatedResponse({
    description: 'Duplicate template created',
    schema: onboardingTemplateSchema,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Software Engineer — Backend' },
        department: { type: 'string', example: 'Engineering' },
      },
    },
  })
  @ApiParam({ name: 'id', format: 'uuid' })
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

  // ── Template Tasks ─────────────────────────────────────────────

  @ApiOperation({ summary: 'Add a task to a template' })
  @ApiCreatedResponse({ description: 'Task added', schema: templateTaskSchema })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiBody({ schema: createTemplateTaskBodySchema })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Post(':id/tasks')
  addTask(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.addTask(companyId, id, body);
  }

  @ApiOperation({ summary: 'Update a task within a template' })
  @ApiOkResponse({ description: 'Task updated', schema: templateTaskSchema })
  @ApiNotFoundResponse({ description: 'Template or task not found' })
  @ApiBody({ schema: updateTemplateTaskBodySchema })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'taskId', format: 'uuid', description: 'Task ID' })
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

  @ApiOperation({ summary: 'Delete a task from a template' })
  @ApiOkResponse({ description: 'Task deleted', schema: successSchema })
  @ApiNotFoundResponse({ description: 'Template or task not found' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Template ID' })
  @ApiParam({ name: 'taskId', format: 'uuid', description: 'Task ID' })
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

  @ApiOperation({
    summary: 'Reorder tasks within a template',
    description:
      'Accepts an ordered array of all task IDs. Used by the drag-and-drop UI to persist new sort order.',
  })
  @ApiOkResponse({
    description: 'Tasks reordered successfully',
    schema: onboardingTemplateSchema,
  })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiBody({ schema: reorderTasksBodySchema })
  @ApiParam({ name: 'id', format: 'uuid' })
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
