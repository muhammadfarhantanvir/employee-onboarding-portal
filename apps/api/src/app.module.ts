import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { HiresModule } from './hires/hires.module';
import { TemplatesModule } from './templates/templates.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ItChecklistModule } from './it-checklist/it-checklist.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { WorkspaceModule } from './workspace/workspace.module';
import { PermissionsGuard } from './common/rbac/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    WorkspaceModule,
    AuthModule,
    CompanyModule,
    HiresModule,
    TemplatesModule,
    TasksModule,
    DocumentsModule,
    AnalyticsModule,
    NotificationsModule,
    ItChecklistModule,
  ],
  controllers: [AppController],
  providers: [
    TenantContextMiddleware,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
