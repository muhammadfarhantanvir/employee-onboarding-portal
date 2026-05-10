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
  hireSchema,
  hireListSchema,
  hireWithTasksSchema,
  createHireBodySchema,
  updateHireBodySchema,
  resendInviteResponseSchema,
  successSchema,
  errorSchema,
  notFoundSchema,
  conflictSchema,
  tooManyRequestsSchema,
  internalErrorSchema,
} from '../common/swagger.schemas';
import { HiresService } from './hires.service';

@ApiTags('Hires')
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
@Controller('hires')
export class HiresController {
  constructor(private readonly hiresService: HiresService) {}

  // ── GET /hires ─────────────────────────────────────────────────

  @ApiOperation({
    summary: 'List all hires',
    description:
      'Returns all hires in the company, optionally filtered by status. ' +
      'Includes a breakdown count per status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_invite', 'in_progress', 'at_risk', 'completed', 'cancelled'],
    description: 'Filter hires by status',
  })
  @ApiOkResponse({
    description: '200 — List of hires returned successfully',
    schema: hireListSchema,
  })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query('status') status?: string,
  ) {
    return this.hiresService.listHires(companyId, status);
  }

  // ── POST /hires ────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Invite a new hire',
    description:
      'Creates a new hire record and sends an onboarding invite. ' +
      'If a templateId is provided, hire tasks are automatically instantiated ' +
      'with due dates calculated relative to the start date.',
  })
  @ApiBody({ schema: createHireBodySchema })
  @ApiCreatedResponse({
    description: '201 — New hire created and invite sent',
    schema: hireWithTasksSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Validation error (missing required fields, invalid email, bad date format)',
    schema: errorSchema,
  })
  @ApiConflictResponse({
    description: '409 — A hire with this email already exists in this company',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.hiresService.createHire(companyId, body, user.id);
  }

  // ── GET /hires/:id ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get hire detail with tasks',
    description:
      'Returns the full hire record including all instantiated tasks, ' +
      'grouped by phase with completion percentage.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Hire found with tasks',
    schema: hireWithTasksSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.hiresService.getHire(companyId, id);
  }

  // ── PATCH /hires/:id ───────────────────────────────────────────

  @ApiOperation({
    summary: 'Update hire metadata',
    description:
      'Update any mutable fields on a hire record. ' +
      'Status transitions are validated (e.g. cannot un-cancel a hire).',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Hire ID' })
  @ApiBody({ schema: updateHireBodySchema })
  @ApiOkResponse({
    description: '200 — Hire updated successfully',
    schema: hireWithTasksSchema,
  })
  @ApiBadRequestResponse({
    description: '400 — Invalid field value or status transition',
    schema: errorSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @RequirePermissions(Permission.UPDATE_HIRE_METADATA)
  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.hiresService.updateHire(companyId, id, body);
  }

  // ── PATCH /hires/:id/approve ───────────────────────────────────

  @ApiOperation({
    summary: 'Approve hire onboarding',
    description:
      'Marks the hire onboarding as completed. ' +
      'Only managers and HR admins can approve. ' +
      'Returns 409 if already completed or cancelled.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Onboarding approved, hire marked as completed',
    schema: hireWithTasksSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Hire is already completed or cancelled',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Patch(':id/approve')
  approve(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.hiresService.approveHire(companyId, id);
  }

  // ── POST /hires/:id/resend-invite ──────────────────────────────

  @ApiOperation({
    summary: 'Resend onboarding invite email',
    description:
      'Re-sends the invite email to the hire. ' +
      'Returns 409 if the hire is cancelled or already completed.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Invite resent successfully',
    schema: resendInviteResponseSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Cannot resend invite to a cancelled or completed hire',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post(':id/resend-invite')
  resendInvite(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.hiresService.resendInvite(companyId, id);
  }

  // ── DELETE /hires/:id ──────────────────────────────────────────

  @ApiOperation({
    summary: 'Cancel / archive a hire',
    description:
      'Soft-cancels a hire by setting status to "cancelled". ' +
      'Returns 409 if the hire is already cancelled.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Hire ID' })
  @ApiOkResponse({
    description: '200 — Hire cancelled successfully',
    schema: successSchema,
  })
  @ApiNotFoundResponse({
    description: '404 — Hire not found',
    schema: notFoundSchema,
  })
  @ApiConflictResponse({
    description: '409 — Hire is already cancelled',
    schema: conflictSchema,
  })
  @RequirePermissions(Permission.DELETE_HIRE)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.hiresService.cancelHire(companyId, id);
  }
}
