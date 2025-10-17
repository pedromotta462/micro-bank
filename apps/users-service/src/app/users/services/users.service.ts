import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
} from '../dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

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

        const { password, ...userWithoutPassword } = finalUser;
        return userWithoutPassword;
      }
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Atualiza a foto de perfil do usuário
   */
  async updateProfilePicture(data: UpdateProfilePictureDto) {
    this.logger.log(`Updating profile picture for user: ${data.userId}`);

    // Verificar se o usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Atualizar foto de perfil
    await this.prisma.user.update({
      where: { id: data.userId },
      data: {
        profilePicture: data.profilePicture,
      },
    });

    return {
      profilePicture: data.profilePicture,
    };
  }
}
