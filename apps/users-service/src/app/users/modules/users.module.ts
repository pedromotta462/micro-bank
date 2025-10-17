import { Module } from '@nestjs/common';
import { UsersController } from '../controlers/users.controller';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service, RedisService } from '../../common/services';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, S3Service, RedisService],
  exports: [UsersService],
})
export class UsersModule {}
