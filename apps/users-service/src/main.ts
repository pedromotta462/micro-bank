/**
 * Users Service - Microservice
 * Handles user management and authentication
 */

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Micro Bank Users Service')
    .setDescription('User management microservice - handles user data, profiles, and banking details')
    .setVersion('1.0.0')
    .addTag('health', 'Health check endpoints')
    .addTag('users', 'User management endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Users Service API',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

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
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/${globalPrefix}/docs`);
  logger.log(`📨 RabbitMQ connected to: ${rabbitmqUrl}`);
  logger.log(`📬 Listening on queue: users_queue`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
