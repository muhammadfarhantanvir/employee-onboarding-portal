import { Module } from '@nestjs/common';
import { ItChecklistController } from './it-checklist.controller';
import { ItChecklistService } from './it-checklist.service';

@Module({
  controllers: [ItChecklistController],
  providers: [ItChecklistService],
  exports: [ItChecklistService],
})
export class ItChecklistModule {}
