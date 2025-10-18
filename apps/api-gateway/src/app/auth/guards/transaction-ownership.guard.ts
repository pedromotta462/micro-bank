import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

/**
 * Guard para validar ownership de transações
 * Verifica se o usuário autenticado é o sender OU receiver da transação
 */
@Injectable()
export class TransactionOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(TransactionOwnershipGuard.name);

  constructor(
    @Inject('TRANSACTIONS_SERVICE_CLIENT')
    private readonly transactionsClient: ClientProxy
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Do JwtStrategy: { userId, email }
    const transactionId = request.params.transactionId;

    this.logger.log(
      `Checking transaction ownership: transactionId=${transactionId}, userId=${user.userId}`
    );

    if (!transactionId) {
      // Se não tem transactionId, permite (não é um recurso de transação específica)
      this.logger.log('No transactionId, allowing access');
      return true;
    }

    try {
      // Busca a transação para verificar ownership
      this.logger.log(`Fetching transaction ${transactionId} from service`);
      
      const transaction = await firstValueFrom(
        this.transactionsClient
          .send({ cmd: 'get_transaction_by_id' }, { transactionId })
          .pipe(timeout(5000))
      );

      this.logger.log(
        `Transaction found: fromUserId=${transaction.senderUserId}, toUserId=${transaction.receiverUserId}`
      );

      // Verifica se o usuário é sender OU receiver
      const isOwner =
        transaction.senderUserId === user.userId ||
        transaction.receiverUserId === user.userId;

      this.logger.log(
        `Ownership check result: isOwner=${isOwner} (user=${user.userId})`
      );

      if (!isOwner) {
        this.logger.warn(
          `Access denied: User ${user.userId} is not owner of transaction ${transactionId}`
        );
        throw new ForbiddenException(
          'You do not have permission to access this transaction'
        );
      }

      this.logger.log(`Access granted for user ${user.userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking transaction ownership: ${error.message}`,
        error.stack
      );
      
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Se erro ao buscar transação, nega acesso
      throw new ForbiddenException(
        'Unable to verify transaction ownership: ' + error.message
      );
    }
  }
}
