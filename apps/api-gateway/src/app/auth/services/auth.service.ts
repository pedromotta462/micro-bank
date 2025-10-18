import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import * as argon2 from 'argon2';
import { LoginDto, RegisterDto } from '../dto';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy
  ) {
    this.logger.info('AuthService initialized');
  }

  /**
   * Valida as credenciais do usuário
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      // Busca usuário pelo email
      const user = await firstValueFrom(
        this.usersClient.send({ cmd: 'get_user_by_email' }, { email })
      );

      if (!user) {
        return null;
      }

      // Verifica a senha usando argon2
      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        return null;
      }

      // Remove a senha do retorno
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    } catch (error: any) {
      this.logger.error({ err: error }, `Error validating user: ${error.message}`);
      return null;
    }
  }

  /**
   * Realiza o login e retorna o JWT token
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.info({ userId: user.id, email: user.email }, `User logged in successfully`);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * Registra um novo usuário
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Hash da senha usando argon2
      const hashedPassword = await argon2.hash(registerDto.password);

      // Cria o usuário através do microserviço
      const user = await firstValueFrom(
        this.usersClient.send(
          { cmd: 'create_user' },
          {
            ...registerDto,
            password: hashedPassword,
          }
        )
      );

      this.logger.info({ userId: user.id, email: user.email }, `User registered successfully`);

      // Faz o login automático após o registro
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };

      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      this.logger.error({ err: error }, `Error registering user: ${error.message}`);

      // Se for erro de email duplicado
      if (error.message?.includes('email') || error.message?.includes('unique')) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  /**
   * Verifica se um token JWT é válido
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
