import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
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
  hireTaskSchema,
  hireTasksListSchema,
  myTasksListSchema,
  updateHireTaskBodySchema,
  addNoteBodySchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { HiresService } from '../hires/hires.service';

@ApiTags('Tasks')
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
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly hiresService: HiresService) {}

  // ── GET /tasks ─────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get my assigned tasks',
    description:
      'Returns all pending/in-progress/blocked tasks assigned to the ' +
      'currently authenticated user across all active hires in the company. ' +
      'Sorted by due date ascending.',
  })
  @ApiOkResponse({
    description: '200 — My tasks returned successfully',
    schema: myTasksListSchema,
  })
  @Get()
  findMyTasks(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tasks = this.hiresService.getMyTasks(companyId, user.id);
    return { tasks, count: tasks.length };
  }

  // ── GET /tasks/hire/:hireId ────────────────────────────────────

  @ApiOperation({
    summary: 'Get all tasks for a specific hire',
    description:
      'Returns all tasks for a hire, optionally filtered by phase. ' +
      'Includes per-phase and per-status breakdowns plus overall completion %.',
  })
  @ApiParam({ name: 'hireId', format: 'uuid', description: 'Hire ID' })
  @ApiQuery({
    name: 'phase',
    required: false,
    enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'],
    description: 'Filter tasks by phase',
  })
  @ApiOkResponse({
    description: '200 — Tasks returned successfully',
    schema: hireTasksListSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get('hire/:hireId')
  findByHire(
    @CompanyId() companyId: string,
    @Param('hireId') hireId: string,
    @Query('phase') phase?: string,
  ) {
    // Verify hire belongs to company
    this.hiresService.getHire(companyId, hireId);
    return this.hiresService.listHireTasks(hireId, phase);
  }

  // ── GET /tasks/:id ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get a single task by ID',
    description: 'Returns the full task record including note, due date, and assignment.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiOkResponse({
    description: '200 — Task found',
    schema: hireTaskSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task not found',
    schema: notFoundSchema,
  })
  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
  ) {
    this.hiresService.getHire(companyId, hireId);
    return this.hiresService.getHireTask(hireId, id);
  }

  // ── PATCH /tasks/:id ───────────────────────────────────────────

  @ApiOperation({
    summary: 'Update a task (status, assignment, due date, note)',
    description:
      'General-purpose task update. Can change status, reassign, update due date, or add a note. ' +
      'Completion percentage on the parent hire is recalculated automatically.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiBody({ schema: updateHireTaskBodySchema })
  @ApiOkResponse({
    description: '200 — Task updated successfully',
    schema: hireTaskSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Invalid status value',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task or hire not found',
    schema: notFoundSchema,
  })
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
    @Body() body: any,
  ) {
    return this.hiresService.updateTask(companyId, hireId, id, body);
  }

  // ── PATCH /tasks/:id/complete ──────────────────────────────────

  @ApiOperation({
    summary: 'Mark a task as complete',
    description:
      'Sets task status to "completed" and records completedAt timestamp. ' +
      'Automatically recalculates hire completion percentage. ' +
      'Returns 409 if already completed or skipped.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiOkResponse({
    description: '200 — Task marked as completed',
    schema: hireTaskSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task or hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Task is already completed or skipped',
    schema: conflictSchema,
  })
  @Patch(':id/complete')
  complete(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
  ) {
    return this.hiresService.completeTask(companyId, hireId, id);
  }

  // ── PATCH /tasks/:id/skip ──────────────────────────────────────

  @ApiOperation({
    summary: 'Skip a non-required task',
    description:
      'Sets task status to "skipped". Only optional (isRequired=false) tasks can be skipped. ' +
      'Returns 400 if the task is required, 409 if already completed or skipped.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiOkResponse({
    description: '200 — Task skipped successfully',
    schema: hireTaskSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Cannot skip a required task',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task or hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Task is already completed or skipped',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.READ_ONBOARDING_PLANS)
  @Patch(':id/skip')
  skip(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
  ) {
    return this.hiresService.skipTask(companyId, hireId, id);
  }

  // ── PATCH /tasks/:id/block ─────────────────────────────────────

  @ApiOperation({
    summary: 'Mark a task as blocked',
    description:
      'Sets task status to "blocked" with an optional note explaining the blocker. ' +
      'Returns 409 if the task is already completed.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string', example: 'Waiting on IT to provision VPN access' },
      },
    },
  })
  @ApiOkResponse({
    description: '200 — Task marked as blocked',
    schema: hireTaskSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task or hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Cannot block a completed task',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.VIEW_ALL_TASKS)
  @Patch(':id/block')
  block(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
    @Body() body: any,
  ) {
    return this.hiresService.blockTask(companyId, hireId, id, body?.note);
  }

  // ── POST /tasks/:id/note ───────────────────────────────────────

  @ApiOperation({
    summary: 'Add or update a note on a task',
    description:
      'Attaches a free-text note to a task. Overwrites any existing note. ' +
      'Useful for managers to leave approval comments or blockers.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Task ID' })
  @ApiQuery({ name: 'hireId', required: true, description: 'Hire ID the task belongs to' })
  @ApiBody({ schema: addNoteBodySchema })
  @ApiOkResponse({
    description: '200 — Note saved on task',
    schema: hireTaskSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — note field is required',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Task or hire not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Post(':id/note')
  addNote(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('hireId') hireId: string,
    @Body() body: any,
  ) {
    return this.hiresService.addNote(companyId, hireId, id, body?.note);
  }
}
