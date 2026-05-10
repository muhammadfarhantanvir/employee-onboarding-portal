import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HiresModule } from '../hires/hires.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [HiresModule, DocumentsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
