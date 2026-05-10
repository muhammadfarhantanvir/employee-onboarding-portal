import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../http.types';

/**
 * Interceptor to log all administrative and state-changing actions
 * Captures user identity, action performed, and outcome for audit trail
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = request;
    const ip = request.ip || 'unknown';
    const user = request.authUser;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logAction(method, url, ip, user, 'SUCCESS', duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error.status || 500;
          this.logAction(method, url, ip, user, `FAILURE (${status})`, duration);
        },
      }),
    );
  }

  private logAction(
    method: string,
    url: string,
    ip: string,
    user: any,
    outcome: string,
    duration: number,
  ) {
    // Skip read-only actions (GET) in production audit log to reduce noise
    // But for this demonstration, we can log them or filter by significant routes
    if (method === 'GET' && !url.includes('/members') && !url.includes('/billing')) {
      return;
    }

    const userId = user?.id || 'anonymous';
    const role = user?.role || 'none';
    const companyId = user?.companyId || 'none';

    this.logger.log(
      `[${outcome}] ${method} ${url} | User: ${userId} (${role}) | Company: ${companyId} | IP: ${ip} | ${duration}ms`,
    );

    // In a real implementation, we would also write this to the audit_log table in the database
    // this.database.auditLog.create({ ... })
  }
}
