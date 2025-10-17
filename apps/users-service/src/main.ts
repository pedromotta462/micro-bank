/**
 * Users Service - Microservice
 * Handles user management and authentication
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('UsersService');
  
  // Create HTTP application for health checks
  const app = await NestFactory.create(AppModule);
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
  
  logger.log(`🚀 Users Service is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📨 RabbitMQ connected to: ${rabbitmqUrl}`);
  logger.log(`📬 Listening on queue: users_queue`);
}

bootstrap();
