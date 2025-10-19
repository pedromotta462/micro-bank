/**
 * Users Service - Microservice
 * Handles user management and authentication
 */

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { MicroserviceExceptionFilter } from './app/common/filters';

async function bootstrap() {
  // Create HTTP application for health checks
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino Logger
  app.useLogger(app.get(Logger));
  
  // Apply global exception filter
  app.useGlobalFilters(new MicroserviceExceptionFilter());
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3002;

  // Connect to RabbitMQ microservice
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'users_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);
  
  const logger = app.get(Logger);
  logger.log(`🚀 Users Service is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📨 RabbitMQ connected to: ${rabbitmqUrl}`);
  logger.log(`📬 Listening on queue: users_queue`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
