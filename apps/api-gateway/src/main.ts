/**
 * API Gateway
 * Routes requests to appropriate microservices
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('APIGateway');
  
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
}

bootstrap();
