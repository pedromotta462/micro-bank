/**
 * Notifications Service - Microservice
 * Responsável por processar e enviar notificações
 */

import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('NotificationsService');

  // Configurar como microservice com RabbitMQ
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: process.env.RABBITMQ_QUEUE || 'notifications_queue',
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    }
  );

  await app.listen();
  
  logger.log('🚀 Notifications Service is running');
  logger.log(`📨 Listening on queue: ${process.env.RABBITMQ_QUEUE || 'notifications_queue'}`);
  logger.log(`🐰 RabbitMQ URL: ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('NotificationsService');
  logger.error('❌ Failed to start Notifications Service', error);
  process.exit(1);
});
