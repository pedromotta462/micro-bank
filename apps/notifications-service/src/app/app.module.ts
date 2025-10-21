import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationsModule } from './notifications/modules/notifications.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    LoggerModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
