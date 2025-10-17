import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
} from '../dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service
  ) {}

  /**
   * Busca um usuário por ID incluindo seus dados bancários
   */
  async getUserById(data: GetUserByIdDto) {
    this.logger.log(`Getting user by id: ${data.userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      include: {
        bankingDetails: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Atualiza dados de um usuário (parcial)
   */
  async updateUser(data: UpdateUserDto) {
    this.logger.log(`Updating user: ${data.userId}`);

    // Verificar se o usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;

    // Atualizar usuário
    const updatedUser = await this.prisma.user.update({
      where: { id: data.userId },
      data: updateData,
      include: {
        bankingDetails: true,
      },
    });

    // Se houver dados bancários para atualizar
    if (data.bankingDetails && updatedUser.bankingDetails) {
      const bankingUpdateData: any = {};

      if (data.bankingDetails.agency !== undefined) {
        bankingUpdateData.agency = data.bankingDetails.agency;
      }
      if (data.bankingDetails.accountNumber !== undefined) {
        bankingUpdateData.accountNumber = data.bankingDetails.accountNumber;
      }

      if (Object.keys(bankingUpdateData).length > 0) {
        await this.prisma.bankingDetails.update({
          where: { userId: data.userId },
          data: bankingUpdateData,
        });

        // Recarregar usuário com dados bancários atualizados
        const finalUser = await this.prisma.user.findUnique({
          where: { id: data.userId },
          include: {
            bankingDetails: true,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = finalUser;
        return userWithoutPassword;
      }
    }

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Faz upload da foto de perfil no S3 e atualiza o usuário
   */
  async uploadProfilePicture(userId: string, file: any) {
    this.logger.log(`Uploading profile picture for user: ${userId} to S3`);

    // Verificar se o usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Reconstituir o arquivo do buffer
    const fileBuffer = Buffer.from(file.buffer.data);
    const fileObject = {
      buffer: fileBuffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    } as any;

    // Fazer upload no S3
    const s3Url = await this.s3Service.uploadFile(fileObject, userId);

    // Atualizar foto de perfil no banco
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: s3Url,
      },
    });

    return {
      profilePicture: s3Url,
    };
  }
}
