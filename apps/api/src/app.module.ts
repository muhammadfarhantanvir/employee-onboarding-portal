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
import { ManagerModule } from './manager/manager.module';
import { GdprModule } from './gdpr/gdpr.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { WorkspaceModule } from './workspace/workspace.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/rbac/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { ObservabilityModule } from './observability/observability.module';
import { HttpMetricsInterceptor } from './observability/http-metrics.interceptor';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'super-secret-at-least-32-chars-long',
      signOptions: {
        // Default sign options - can be overridden when signing tokens
      },
    }),
    WorkspaceModule,
    ObservabilityModule,
    AuthModule,
    CompanyModule,
    HiresModule,
    TemplatesModule,
    TasksModule,
    DocumentsModule,
    AnalyticsModule,
    NotificationsModule,
    ItChecklistModule,
    ManagerModule,
    GdprModule,
  ],
  controllers: [AppController],
  providers: [
    TenantContextMiddleware,
    // JwtAuthGuard MUST run before PermissionsGuard so authUser is populated
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
