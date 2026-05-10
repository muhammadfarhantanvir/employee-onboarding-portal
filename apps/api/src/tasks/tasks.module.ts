import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { HiresModule } from '../hires/hires.module';

@Module({
  imports: [HiresModule],
  controllers: [TasksController],
})
export class TasksModule {}
