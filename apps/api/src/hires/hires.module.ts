import { Module } from '@nestjs/common';
import { HiresController } from './hires.controller';

@Module({
  controllers: [HiresController],
})
export class HiresModule {}
