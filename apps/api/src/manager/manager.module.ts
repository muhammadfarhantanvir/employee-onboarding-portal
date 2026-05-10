import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { HiresModule } from '../hires/hires.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [HiresModule, NotificationsModule],
  controllers: [ManagerController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}
