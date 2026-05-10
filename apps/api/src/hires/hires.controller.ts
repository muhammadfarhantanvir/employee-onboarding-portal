import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { CompanyId } from '../common/decorators/company-id.decorator';
import { hireSchema, createHireBodySchema, successSchema } from '../common/swagger.schemas';

@ApiTags('Hires')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('hires')
export class HiresController {
  @ApiOperation({ summary: 'List all hires in the company' })
  @ApiOkResponse({ 
    description: 'List of hires returned successfully',
    schema: { type: 'object', properties: { hires: { type: 'array', items: hireSchema }, count: { type: 'number' } } } 
  })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get()
  findAll(@CompanyId() companyId: string) {
    return { hires: [], count: 0 };
  }

  @ApiOperation({ summary: 'Invite a new hire' })
  @ApiCreatedResponse({ description: 'New hire invited successfully', schema: hireSchema })
  @ApiBody({ schema: createHireBodySchema })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post()
  create(@CompanyId() companyId: string, @Body() body: any) {
    return { id: 'uuid', ...body, status: 'pending_invite' };
  }

  @ApiOperation({ summary: 'Get hire detail' })
  @ApiOkResponse({ description: 'Hire found', schema: hireSchema })
  @ApiNotFoundResponse({ description: 'Hire not found' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @ApiOperation({ summary: 'Approve a hire onboarding' })
  @ApiOkResponse({ description: 'Onboarding approved', schema: successSchema })
  @ApiNotFoundResponse({ description: 'Hire not found' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @RequirePermissions(Permission.APPROVE_ONBOARDING)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Resend invite email' })
  @ApiOkResponse({ description: 'Invite resent', schema: successSchema })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post(':id/resend-invite')
  resendInvite(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Cancel or archive a hire' })
  @ApiOkResponse({ description: 'Hire cancelled', schema: successSchema })
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return { success: true };
  }
}
