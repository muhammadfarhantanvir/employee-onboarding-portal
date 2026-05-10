import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { documentSchema, successSchema } from '../common/swagger.schemas';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('documents')
export class DocumentsController {
  @ApiOperation({ summary: 'List all company template documents' })
  @ApiOkResponse({ 
    description: 'List of company documents',
    schema: { type: 'object', properties: { documents: { type: 'array', items: documentSchema } } } 
  })
  @RequirePermissions(Permission.MANAGE_DOCUMENTS)
  @Get('company')
  findCompanyDocs() {
    return { documents: [] };
  }

  @ApiOperation({ summary: 'List a specific hire\'s documents' })
  @ApiOkResponse({ 
    description: 'List of hire documents',
    schema: { type: 'object', properties: { documents: { type: 'array', items: documentSchema } } } 
  })
  @ApiParam({ name: 'hireId', format: 'uuid' })
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get('hire/:hireId')
  findByHire(@Param('hireId') hireId: string) {
    return { documents: [] };
  }

  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiOkResponse({ 
    description: 'Signed URL valid for 60 minutes',
    schema: { type: 'object', properties: { url: { type: 'string', example: 'https://supabase.co/storage/v1/object/sign/...' } } } 
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Get(':id/url')
  getUrl(@Param('id') id: string) {
    return { url: 'https://...' };
  }

  @ApiOperation({ summary: 'Approve an uploaded document' })
  @ApiOkResponse({ description: 'Document approved', schema: successSchema })
  @RequirePermissions(Permission.MANAGE_DOCUMENTS)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Reject an uploaded document' })
  @ApiOkResponse({ description: 'Document rejected', schema: successSchema })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string', example: 'Image is blurry' } } } })
  @RequirePermissions(Permission.MANAGE_DOCUMENTS)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() body: any) {
    return { success: true };
  }
}
