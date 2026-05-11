import { LoggerService } from '@nestjs/common';
import { mkdirSync } from 'fs';
import path from 'path';
import pino, { Logger } from 'pino';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface HttpRequestLogEntry {
  reqId?: string;
  traceId?: string;
  method: string;
  route: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  companyId?: string;
  ip?: string;
}

const LOG_FILE_PATH =
  process.env.LOG_FILE_PATH ?? path.resolve(process.cwd(), 'logs/nestjs/app.log');

function buildLogger(): Logger {
  mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true });

  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: {
        service: process.env.OTEL_SERVICE_NAME ?? 'employee-onboarding-api',
      },
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
      { stream: process.stdout },
      {
        stream: pino.destination({
          dest: LOG_FILE_PATH,
          mkdir: true,
          sync: false,
        }),
      },
    ]),
  );
}

const logger = buildLogger();

export function logHttpRequest(entry: HttpRequestLogEntry): void {
  const level: LogLevel = entry.statusCode >= 500
    ? 'error'
    : entry.statusCode >= 400
      ? 'warn'
      : 'info';
  logger[level]({ ...entry, event: 'http_request' }, 'request completed');
}

export class PinoNestLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    if (message instanceof Error) {
      logger[level](
        {
          context,
          err: message,
          stack: trace ?? message.stack,
        },
        message.message,
      );
      return;
    }

    logger[level](
      {
        context,
        stack: trace,
      },
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

export function createPinoNestLogger(): LoggerService {
  return new PinoNestLogger();
}
