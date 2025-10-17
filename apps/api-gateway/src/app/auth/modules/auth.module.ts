import { Module } from '@nestjs/common';
import { AuthController } from '../controlers/auth.controller';
import { AuthService } from '../services/auth.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
