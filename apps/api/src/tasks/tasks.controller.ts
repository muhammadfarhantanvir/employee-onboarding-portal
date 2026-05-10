import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { hireTaskSchema, successSchema } from '../common/swagger.schemas';

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('tasks')
export class TasksController {
  @ApiOperation({ summary: 'Get my assigned tasks' })
  @ApiOkResponse({ 
    description: 'List of assigned tasks',
    schema: { type: 'object', properties: { tasks: { type: 'array', items: hireTaskSchema } } } 
  })
  @Get()
  findMyTasks() {
    return { tasks: [] };
  }

  @ApiOperation({ summary: 'All tasks for a specific hire' })
  @ApiOkResponse({ 
    description: 'List of tasks for the hire',
    schema: { type: 'object', properties: { tasks: { type: 'array', items: hireTaskSchema } } } 
  })
  @ApiParam({ name: 'hireId', format: 'uuid' })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get('hire/:hireId')
  findByHire(@Param('hireId') hireId: string) {
    return { tasks: [] };
  }

  @ApiOperation({ summary: 'Mark task as complete' })
  @ApiOkResponse({ description: 'Task completed', schema: successSchema })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Skip a non-required task' })
  @ApiOkResponse({ description: 'Task skipped', schema: successSchema })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Patch(':id/skip')
  skip(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Add a note to a task' })
  @ApiOkResponse({ description: 'Note added', schema: successSchema })
  @ApiBody({ schema: { type: 'object', properties: { note: { type: 'string', example: 'Everything looks good' } } } })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post(':id/note')
  addNote(@Param('id') id: string, @Body() body: any) {
    return { success: true };
  }
}
