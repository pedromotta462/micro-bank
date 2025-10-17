import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor() {
    this.logger.log('AuthService initialized - Authentication to be implemented');
  }

  // TODO: Implementar métodos de autenticação
  // - validateUser()
  // - login()
  // - register()
  // - verifyToken()
  // - refreshToken()
}
