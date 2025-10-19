import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthService } from '../services/auth.service';
import { LoginDto, LoginSchema, RegisterDto, RegisterSchema } from '../dto';
import { ZodValidationPipe } from '../../common/pipes';
import { JwtAuthGuard } from '../guards';
import { CurrentUser, CurrentUserData } from '../decorators';

@ApiTags('auth')
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
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT token' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'carlos@microbank.com' },
        password: { type: 'string', example: 'senha123' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Login successful - JWT token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'User registration', description: 'Register new user and return JWT token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'newuser@microbank.com' },
        password: { type: 'string', example: 'senha123' },
        name: { type: 'string', example: 'João Silva' },
        cpf: { type: 'string', example: '12345678900' },
        phone: { type: 'string', example: '11999999999' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'User registered successfully - JWT token returned' })
  @ApiResponse({ status: 400, description: 'Invalid data or user already exists' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user profile', description: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    this.logger.info(`Profile request for user: ${user.userId}`);
    return {
      userId: user.userId,
      email: user.email,
    };
  }
}
