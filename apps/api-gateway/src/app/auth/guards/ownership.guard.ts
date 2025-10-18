import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Guard para validar ownership de recursos
 * Verifica se o userId do token JWT é o mesmo do recurso sendo acessado
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Vem do JwtStrategy após validação
    const resourceUserId = request.params.userId || request.body.userId;

    // Se não tiver userId no recurso, permite (não é um recurso que precisa ownership)
    if (!resourceUserId) {
      return true;
    }

    // Valida se o usuário autenticado é o dono do recurso
    if (user.userId !== resourceUserId) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
