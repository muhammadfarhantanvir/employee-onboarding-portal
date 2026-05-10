import { Module } from '@nestjs/common';
import { HiresController } from './hires.controller';
import { HiresService } from './hires.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TemplatesModule],
  controllers: [HiresController],
  providers: [HiresService],
  exports: [HiresService],
})
export class HiresModule {}
