/**
 * API Gateway
 * Routes requests to appropriate microservices
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Micro Bank API Gateway')
    .setDescription('API Gateway for Micro Bank microservices architecture')
    .setVersion('1.0.0')
    .addTag('health', 'Health check endpoints')
    .addTag('auth', 'Authentication and authorization')
    .addTag('users', 'User management')
    .addTag('transactions', 'Transaction operations')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Micro Bank API',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  
  const logger = app.get(Logger);
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/${globalPrefix}/docs`);
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
