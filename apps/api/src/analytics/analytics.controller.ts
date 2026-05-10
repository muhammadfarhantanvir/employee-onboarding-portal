import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { Permission, RequirePermissions } from '../common/rbac';
import { analyticsOverviewSchema } from '../common/swagger.schemas';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('analytics')
export class AnalyticsController {
  @ApiOperation({ summary: 'Get KPI overview' })
  @ApiOkResponse({ description: 'Analytics summary', schema: analyticsOverviewSchema })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('overview')
  getOverview() {
    return {
      activeHires: 12,
      completionRate: 84,
      atRiskHires: 2,
      pendingDocuments: 5
    };
  }

  @ApiOperation({ summary: 'Completion rate by department' })
  @ApiOkResponse({ description: 'Department-wise breakdown' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('completion-rate')
  getCompletionRate() {
    return [];
  }

  @ApiOperation({ summary: 'Average time to complete by phase' })
  @ApiOkResponse({ description: 'Phase-wise time metrics' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get('time-to-complete')
  getTimeToComplete() {
    return [];
  }
}
