/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('TransactionsService');

  // Criar aplicação híbrida (HTTP + RabbitMQ)
  const app = await NestFactory.create(AppModule);
  
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
  logger.log('🎯 Microservice is listening on transactions_queue');

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  logger.log(`📨 Connected to RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
}

bootstrap();
