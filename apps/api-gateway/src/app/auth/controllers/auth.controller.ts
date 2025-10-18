import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, LoginSchema, RegisterDto, RegisterSchema } from '../dto';
import { ZodValidationPipe } from '../../common/pipes';

@Controller('/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Login de usuário (a ser implementado)
   */
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto
  ) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    // TODO: Implementar autenticação
    return {
      message: 'Authentication endpoint - To be implemented',
      email: loginDto.email,
    };
  }

  /**
   * POST /api/auth/register
   * Registro de novo usuário (a ser implementado)
   */
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) registerDto: RegisterDto
  ) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    // TODO: Implementar registro
    return {
      message: 'Registration endpoint - To be implemented',
      email: registerDto.email,
    };
  }
}
