import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { WorkspaceModule } from './workspace/workspace.module';
import { PermissionsGuard } from './common/rbac/permissions.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    WorkspaceModule,
    AuthModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [
    TenantContextMiddleware,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
