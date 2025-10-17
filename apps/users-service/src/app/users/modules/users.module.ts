import { Module } from '@nestjs/common';
import { UsersController } from '../controlers/users.controller';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../../../prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
