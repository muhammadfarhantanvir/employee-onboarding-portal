import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AuthenticatedRequest } from '../common/http.types';
import { logHttpRequest } from './pino-logger';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    let thrownError: unknown;

    this.metrics.startHttpRequest();

    return next.handle().pipe(
      tap({
        error: (error) => {
          thrownError = error;
        },
      }),
      finalize(() => {
        const durationSeconds =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        const durationMs = Math.round(durationSeconds * 1000);
        const statusCode = this.resolveStatusCode(response, thrownError);
        const route = this.resolveRoute(request);
        const method = request.method ?? 'UNKNOWN';

        this.metrics.finishHttpRequest(
          {
            method,
            route,
            statusCode,
          },
          durationSeconds,
        );

        logHttpRequest({
          reqId: request.headers['x-request-id']?.toString(),
          traceId: trace.getActiveSpan()?.spanContext().traceId,
          method,
          route,
          path: request.originalUrl ?? request.url ?? route,
          statusCode,
          durationMs,
          userId: request.authUser?.id,
          companyId: request.companyId ?? request.authUser?.companyId,
          ip: request.ip,
        });
      }),
    );
  }

  private resolveStatusCode(response: Response, error: unknown): number {
    if (error && typeof error === 'object' && 'getStatus' in error) {
      const getStatus = (error as { getStatus?: () => number }).getStatus;
      if (typeof getStatus === 'function') {
        return getStatus.call(error);
      }
    }

    return response.statusCode || 500;
  }

  private resolveRoute(request: Request): string {
    const routePath =
      request.route && typeof request.route.path === 'string'
        ? request.route.path
        : undefined;
    const baseUrl = request.baseUrl ?? '';
    const rawPath = routePath
      ? `${baseUrl}${routePath}`
      : (request.path ?? request.url ?? 'unknown').split('?')[0];

    return rawPath
      .replace(/\/+/g, '/')
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
        ':uuid',
      )
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }
}
