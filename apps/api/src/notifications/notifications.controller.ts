import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { notificationSchema, successSchema } from '../common/swagger.schemas';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('notifications')
export class NotificationsController {
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiOkResponse({ 
    description: 'List of notifications',
    schema: { type: 'object', properties: { notifications: { type: 'array', items: notificationSchema } } } 
  })
  @Get()
  findAll() {
    return { notifications: [] };
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiOkResponse({ description: 'Notification updated', schema: successSchema })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return { success: true };
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'All notifications updated', schema: successSchema })
  @Patch('read-all')
  markAllRead() {
    return { success: true };
  }

  @ApiOperation({ summary: 'Unread count for badge' })
  @ApiOkResponse({ 
    description: 'Count of unread notifications',
    schema: { type: 'object', properties: { count: { type: 'number', example: 3 } } } 
  })
  @Get('unread-count')
  getUnreadCount() {
    return { count: 0 };
  }
}
