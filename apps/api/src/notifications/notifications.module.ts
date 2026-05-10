import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WorkflowService } from './workflow.service';
import { WorkflowScheduler } from './workflow.scheduler';
import { EmailService } from './email.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WorkflowService,
    WorkflowScheduler,
    EmailService,
  ],
  exports: [NotificationsService, WorkflowService, EmailService],
})
export class NotificationsModule {}
