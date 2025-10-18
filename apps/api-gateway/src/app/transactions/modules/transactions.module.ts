import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TransactionsController } from '../controllers/transactions.controller';
import { TransactionsService } from '../services/transactions.service';
import { TransactionOwnershipGuard } from '../../auth/guards';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TRANSACTIONS_SERVICE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'transactions_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionOwnershipGuard],
  exports: [TransactionsService],
})
export class TransactionsModule {}
