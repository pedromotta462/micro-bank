/**
 * Transactions Service - Microservice
 * Handles transaction processing and management
 */

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { MicroserviceExceptionFilter } from './app/common/filters';

async function bootstrap() {
  // Criar aplicação híbrida (HTTP + RabbitMQ)
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino Logger
  app.useLogger(app.get(Logger));
  
  // Apply global exception filter
  app.useGlobalFilters(new MicroserviceExceptionFilter());
  
  // Configurar prefixo global para rotas HTTP
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Micro Bank Transactions Service')
    .setDescription('Transaction processing microservice - handles transfers, payments, and transaction history with idempotency support')
    .setVersion('1.0.0')
    .addTag('health', 'Health check endpoints')
    .addTag('transactions', 'Transaction management endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Transactions Service API',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Conectar ao RabbitMQ como microserviço
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'transactions_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  
  const logger = app.get(Logger);
  logger.log('🎯 Microservice is listening on transactions_queue');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/${globalPrefix}/docs`);
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
