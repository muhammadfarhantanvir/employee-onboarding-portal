import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.setHeader('Content-Type', this.metricsService.contentType);
    return this.metricsService.metrics();
  }
}
