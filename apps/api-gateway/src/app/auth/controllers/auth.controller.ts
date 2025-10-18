import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthService } from '../services/auth.service';
import { LoginDto, LoginSchema, RegisterDto, RegisterSchema } from '../dto';
import { ZodValidationPipe } from '../../common/pipes';
import { JwtAuthGuard } from '../guards';
import { CurrentUser, CurrentUserData } from '../decorators';

@Controller('/auth')
export class AuthController {
  constructor(
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
    private readonly authService: AuthService
  ) {}

  /**
   * POST /api/auth/login
   * Login de usuário - retorna JWT token
   */
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto
  ) {
    this.logger.info(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/register
   * Registro de novo usuário - retorna JWT token
   */
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) registerDto: RegisterDto
  ) {
    this.logger.info(`Registration attempt for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * GET /api/auth/profile
   * Retorna o perfil do usuário autenticado
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    this.logger.info(`Profile request for user: ${user.userId}`);
    return {
      userId: user.userId,
      email: user.email,
    };
  }
}
