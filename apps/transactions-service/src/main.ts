/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
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
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
