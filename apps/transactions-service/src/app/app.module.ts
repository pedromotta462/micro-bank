import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionsModule } from './transactions/modules/transactions.module';

@Module({
  imports: [TransactionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
