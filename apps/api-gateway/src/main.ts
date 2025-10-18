/**
 * API Gateway
 * Routes requests to appropriate microservices
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter, RpcExceptionFilter } from './app/common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino Logger
  app.useLogger(app.get(Logger));
  
  // Apply global exception filters
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new RpcExceptionFilter()
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  
  const logger = app.get(Logger);
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
