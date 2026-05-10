import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { CompanyId } from '../common/decorators/company-id.decorator';
import { 
  onboardingTemplateSchema, 
  templateTaskSchema, 
  createTemplateBodySchema, 
  updateTemplateBodySchema,
  createTemplateTaskBodySchema,
  updateTemplateTaskBodySchema,
  reorderTasksBodySchema
} from '../common/swagger.schemas';

@ApiTags('Onboarding Templates')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('templates')
export class TemplatesController {
  @ApiOperation({ summary: 'List all onboarding templates' })
  @ApiOkResponse({ 
    description: 'List of templates returned successfully',
    schema: { type: 'object', properties: { templates: { type: 'array', items: onboardingTemplateSchema } } } 
  })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get()
  findAll(@CompanyId() companyId: string) {
    return { templates: [] };
  }

  @ApiOperation({ summary: 'Create a new onboarding template' })
  @ApiCreatedResponse({ description: 'Template created successfully', schema: onboardingTemplateSchema })
  @ApiBody({ schema: createTemplateBodySchema })
  @RequirePermissions(Permission.CREATE_ONBOARDING_PLANS)
  @Post()
  create(@CompanyId() companyId: string, @Body() body: any) {
    return { id: 'uuid', ...body };
  }

  @ApiOperation({ summary: 'Get template with its tasks' })
  @ApiOkResponse({ description: 'Template found', schema: onboardingTemplateSchema })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @ApiOperation({ summary: 'Update template metadata' })
  @ApiOkResponse({ description: 'Template updated', schema: onboardingTemplateSchema })
  @ApiBody({ schema: updateTemplateBodySchema })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }

  @ApiOperation({ summary: 'Delete a template' })
  @ApiOkResponse({ description: 'Template deleted' })
  @RequirePermissions(Permission.DELETE_ONBOARDING_PLANS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Add task to template' })
  @ApiCreatedResponse({ description: 'Task added', schema: templateTaskSchema })
  @ApiBody({ schema: createTemplateTaskBodySchema })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Post(':id/tasks')
  addTask(@Param('id') id: string, @Body() body: any) {
    return { id: 'task-uuid', templateId: id, ...body };
  }

  @ApiOperation({ summary: 'Update sort order of tasks' })
  @ApiOkResponse({ description: 'Tasks reordered' })
  @ApiBody({ schema: reorderTasksBodySchema })
  @RequirePermissions(Permission.UPDATE_ONBOARDING_PLANS)
  @Post(':id/tasks/reorder')
  reorderTasks(@Param('id') id: string, @Body() body: any) {
    return { success: true };
  }
}
