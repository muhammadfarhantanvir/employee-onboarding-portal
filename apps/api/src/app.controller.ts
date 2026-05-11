import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { apiRootSchema, statusSchema } from './common/swagger.schemas';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'API index and route hints' })
  @ApiOkResponse({ schema: apiRootSchema })
  @Public()
  @Get()
  getApiRoot() {
    return {
      name: 'Employee Onboarding API',
      status: 'ok',
      routes: {
        auth: '/api/auth',
        company: '/api/company',
        docs: '/api/docs',
        health: '/api/health',
      },
    };
  }

  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ schema: statusSchema })
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
