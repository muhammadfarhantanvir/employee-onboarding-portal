import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CompanyId } from '../common/decorators/company-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyGuard } from '../common/guards/company.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  companySchema,
  inviteMemberBodySchema,
  logoBodySchema,
  memberSchema,
  roleBodySchema,
  transferOwnershipBodySchema,
  updateCompanyBodySchema,
} from '../common/swagger.schemas';
import { AuthenticatedUser, Role } from '../workspace/workspace.types';

@ApiTags('Company')
@Controller('company')
export class CompanyPublicController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Resolve a public workspace by slug' })
  @ApiParam({ name: 'slug', example: 'demo-company' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { company: companySchema },
    },
  })
  @ApiNotFoundResponse({ description: 'Company workspace was not found' })
  @Get('resolve/:slug')
  resolveWorkspace(@Param('slug') slug: string) {
    return this.companyService.resolveWorkspace(slug);
  }
}

@ApiTags('Company')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({
  description: 'Token tenant, subdomain, or role is not allowed',
})
@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Get the current company workspace' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { company: companySchema },
    },
  })
  @Get()
  getCompany(@CompanyId() companyId: string) {
    return this.companyService.getCompany(companyId);
  }

  @ApiOperation({ summary: 'Update company workspace settings' })
  @ApiBody({ schema: updateCompanyBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { company: companySchema },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Patch()
  updateCompany(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.companyService.updateCompany(companyId, user, body);
  }

  @ApiOperation({ summary: 'Update company logo URL' })
  @ApiBody({ schema: logoBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { company: companySchema },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Post('logo')
  updateLogo(@CompanyId() companyId: string, @Body() body: unknown) {
    return this.companyService.updateLogo(companyId, body);
  }

  @ApiOperation({ summary: 'List company members' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        members: {
          type: 'array',
          items: memberSchema,
        },
      },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Get('members')
  listMembers(@CompanyId() companyId: string) {
    return this.companyService.listMembers(companyId);
  }

  @ApiOperation({ summary: 'Invite a member to the company workspace' })
  @ApiBody({ schema: inviteMemberBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        member: memberSchema,
        inviteToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Post('members/invite')
  inviteMember(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.companyService.inviteMember(companyId, user, body);
  }

  @ApiOperation({ summary: 'Change a workspace member role' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiBody({ schema: roleBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { member: memberSchema },
    },
  })
  @ApiNotFoundResponse({ description: 'Member was not found in this company' })
  @Roles(Role.HR_ADMIN)
  @Patch('members/:userId/role')
  changeMemberRole(
    @CompanyId() companyId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    return this.companyService.changeMemberRole(companyId, userId, body);
  }

  @ApiOperation({ summary: 'Deactivate a workspace member' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { member: memberSchema },
    },
  })
  @ApiNotFoundResponse({ description: 'Member was not found in this company' })
  @Roles(Role.HR_ADMIN)
  @Delete('members/:userId')
  deactivateMember(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.companyService.deactivateMember(companyId, user, userId);
  }

  @ApiOperation({ summary: 'Transfer company ownership to another member' })
  @ApiBody({ schema: transferOwnershipBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        company: companySchema,
        owner: memberSchema,
      },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Patch('owner')
  transferOwnership(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.companyService.transferOwnership(companyId, user, body);
  }
}
