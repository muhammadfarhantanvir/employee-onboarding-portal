import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  billingSchema,
  companySchema,
  domainVerificationBodySchema,
  domainVerificationChallengeSchema,
  inviteMemberBodySchema,
  logoBodySchema,
  memberSchema,
  roleBodySchema,
  transferOwnershipBodySchema,
  updateBillingBodySchema,
  updateCompanyBodySchema,
  verifyDomainBodySchema,
  workspaceAvailabilitySchema,
} from '../common/swagger.schemas';
import { AuthenticatedUser, Role } from '../workspace/workspace.types';

@ApiTags('Company')
@Controller('company')
export class CompanyPublicController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Check workspace slug and domain availability' })
  @ApiQuery({ name: 'slug', required: false, example: 'acme' })
  @ApiQuery({ name: 'domain', required: false, example: 'acme.com' })
  @ApiOkResponse({ schema: workspaceAvailabilitySchema })
  @Get('availability')
  checkAvailability(
    @Query('slug') slug?: string,
    @Query('domain') domain?: string,
  ) {
    return this.companyService.checkAvailability(slug, domain);
  }

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

  @ApiOperation({ summary: 'Create a domain verification TXT challenge' })
  @ApiBody({ schema: domainVerificationBodySchema, required: false })
  @ApiOkResponse({ schema: domainVerificationChallengeSchema })
  @ApiConflictResponse({
    description: 'The requested domain is already registered',
  })
  @Roles(Role.HR_ADMIN)
  @Post('domain/verification')
  requestDomainVerification(
    @CompanyId() companyId: string,
    @Body() body: unknown,
  ) {
    return this.companyService.requestDomainVerification(companyId, body);
  }

  @ApiOperation({ summary: 'Verify a pending company domain challenge' })
  @ApiBody({ schema: verifyDomainBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { company: companySchema },
    },
  })
  @ApiConflictResponse({
    description: 'No pending challenge, expired challenge, or invalid token',
  })
  @Roles(Role.HR_ADMIN)
  @Post('domain/verify')
  verifyDomain(@CompanyId() companyId: string, @Body() body: unknown) {
    return this.companyService.verifyDomain(companyId, body);
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

  @ApiOperation({ summary: 'Get billing tier and active hire limit' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { billing: billingSchema },
    },
  })
  @Get('billing')
  getBilling(@CompanyId() companyId: string) {
    return this.companyService.getBilling(companyId);
  }

  @ApiOperation({ summary: 'Update billing tier' })
  @ApiBody({ schema: updateBillingBodySchema })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        billing: billingSchema,
        company: companySchema,
      },
    },
  })
  @Roles(Role.HR_ADMIN)
  @Patch('billing')
  updateBillingPlan(@CompanyId() companyId: string, @Body() body: unknown) {
    return this.companyService.updateBillingPlan(companyId, body);
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
