import { Module } from '@nestjs/common';
import { UsersController } from '../controlers/users.controller';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, S3Service],
  exports: [UsersService],
})
export class UsersModule {}
