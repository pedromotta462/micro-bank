import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Request } from 'express';

/**
 * Logger Module with Pino
 * Provides structured logging across the application
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                  singleLine: false,
                  messageFormat: '{req.method} {req.url} - {msg}',
                },
              }
            : undefined,
        customProps: (req: Request) => ({
          userId: (req as any).user?.userId,
          userEmail: (req as any).user?.email,
        }),
        serializers: {
          req: (req: Request) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            body: req.body,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
          err: (err: Error) => ({
            type: err.name,
            message: err.message,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
          }),
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.token',
          ],
          remove: true,
        },
        autoLogging: {
          ignore: (req: Request) => {
            // Don't log health checks
            return req.url === '/api/health' || req.url === '/health';
          },
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
