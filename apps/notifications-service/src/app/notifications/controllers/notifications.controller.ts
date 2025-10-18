import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from '../services/notifications.service';
import {
  TransactionNotificationSchema,
  BalanceUpdatedNotificationSchema,
  UserUpdatedNotificationSchema,
} from '../dto';

/**
 * Controller responsável por receber eventos de notificação via RabbitMQ
 */
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * EventPattern: transaction_notification
   * Recebe notificações de transações (criadas, processadas, completadas, falhas)
   */
  @EventPattern('transaction_notification')
  async handleTransactionNotification(
    @Payload() rawData: unknown
  ) {
    try {
      // Validação com Zod
      const data = TransactionNotificationSchema.parse(rawData);
      
      this.logger.log(
        `📥 Received transaction_notification event: ${data.transactionId}`
      );

      await this.notificationsService.handleTransactionNotification(data);
    } catch (error) {
      this.logger.error(
        `Error handling transaction notification: ${error.message}`,
        error.stack
      );
      // Não propagar erro para não reenviar a mensagem
    }
  }

  /**
   * EventPattern: notifications.balance.updated
   * Recebe notificações de atualização de saldo (débito/crédito)
   */
  @EventPattern('notifications.balance.updated')
  async handleBalanceUpdatedNotification(
    @Payload() rawData: unknown
  ) {
    try {
      // Validação com Zod
      const data = BalanceUpdatedNotificationSchema.parse(rawData);
      
      this.logger.log(
        `📥 Received balance updated event: User ${data.userId} - ${data.type}`
      );

      await this.notificationsService.handleBalanceUpdatedNotification(data);
    } catch (error) {
      this.logger.error(
        `Error handling balance notification: ${error.message}`,
        error.stack
      );
      // Não propagar erro para não reenviar a mensagem
    }
  }

  /**
   * EventPattern: notifications.user.updated
   * Recebe notificações de atualização de dados de usuário
   */
  @EventPattern('notifications.user.updated')
  async handleUserUpdatedNotification(
    @Payload() rawData: unknown
  ) {
    try {
      // Validação com Zod
      const data = UserUpdatedNotificationSchema.parse(rawData);
      
      this.logger.log(`📥 Received user updated event: User ${data.userId}`);

      await this.notificationsService.handleUserUpdatedNotification(data);
    } catch (error) {
      this.logger.error(
        `Error handling user notification: ${error.message}`,
        error.stack
      );
      // Não propagar erro para não reenviar a mensagem
    }
  }
}
