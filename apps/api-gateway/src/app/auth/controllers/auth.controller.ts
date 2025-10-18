import { Controller, Post, Body, Logger, Get, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, LoginSchema, RegisterDto, RegisterSchema } from '../dto';
import { ZodValidationPipe } from '../../common/pipes';
import { JwtAuthGuard } from '../guards';
import { CurrentUser, CurrentUserData } from '../decorators';

@Controller('/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Login de usuário - retorna JWT token
   */
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto
  ) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
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
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * GET /api/auth/profile
   * Retorna o perfil do usuário autenticado
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`Profile request for user: ${user.userId}`);
    return {
      userId: user.userId,
      email: user.email,
    };
  }
}
