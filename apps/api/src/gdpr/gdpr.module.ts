import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { HiresModule } from '../hires/hires.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [HiresModule, DocumentsModule],
  controllers: [GdprController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
