import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Logger Module for Microservices with Pino
 * Provides structured logging across the microservice
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
                },
              }
            : undefined,
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
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
          paths: ['password', 'confirmPassword', 'cpf', 'token'],
          remove: true,
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
