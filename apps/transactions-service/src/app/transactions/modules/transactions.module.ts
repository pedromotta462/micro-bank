import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TransactionsController } from '../controllers/transactions.controller';
import { TransactionsService } from '../services/transactions.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USERS_SERVICE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'users_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
      {
        name: 'NOTIFICATIONS_SERVICE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'notifications_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
