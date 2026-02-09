import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private prisma: PrismaService) {}

  @Get('friends')
  async getFriends(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    const friends = await this.prisma.userFriend.findMany({
      where: { userId: user.sub },
      include: { friend: { select: { id: true, name: true, email: true } } },
    });
    return friends.map((f) => f.friend);
  }

  @Post('friends/search')
  async searchUsers(@Body('email') email: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!email) {
      throw new BadRequestException('Email harus diisi');
    }
    const users = await this.prisma.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
        id: { not: user.sub }, // Exclude current user
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    return users;
  }

  @Post('friends/add')
  async addFriend(@Body('friendId') friendId: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!friendId) {
      throw new BadRequestException('friendId harus diisi');
    }
    
    if (user.sub === friendId) {
      throw new BadRequestException('Tidak bisa menambah diri sendiri sebagai teman');
    }

    // Check if friend exists
    const friendExists = await this.prisma.user.findUnique({
      where: { id: friendId },
    });
    if (!friendExists) {
      throw new BadRequestException('User tidak ditemukan');
    }

    const existing = await this.prisma.userFriend.findFirst({
      where: { userId: user.sub, friendId },
    });

    if (existing) {
      throw new BadRequestException('Sudah menjadi teman');
    }

    return await this.prisma.userFriend.create({
      data: { userId: user.sub, friendId },
      include: { friend: { select: { id: true, name: true, email: true } } },
    });
  }

  @Delete('friends/:friendId')
  async removeFriend(@Param('friendId') friendId: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    await this.prisma.userFriend.deleteMany({
      where: { userId: user.sub, friendId },
    });
    return { message: 'Friend removed' };
  }

  @Get('groups')
  async getGroups(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    const groups = await this.prisma.group.findMany({
      where: { members: { some: { id: user.sub } } },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
    return groups;
  }

  @Post('groups')
  async createGroup(@Body('name') name: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!name) {
      throw new BadRequestException('Nama grup harus diisi');
    }
    return await this.prisma.group.create({
      data: {
        name,
        members: { connect: { id: user.sub } },
      },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
  }

  @Post('groups/:groupId/members')
  async addMemberToGroup(
    @Param('groupId') groupId: string,
    @Body('userId') memberId: string,
    @CurrentUser() user: any,
  ) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!memberId) {
      throw new BadRequestException('userId harus diisi');
    }
    
    // Verify group exists and user is a member
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: { some: { id: user.sub } },
      },
    });
    
    if (!group) {
      throw new BadRequestException('Grup tidak ditemukan atau Anda bukan anggota');
    }

    return await this.prisma.group.update({
      where: { id: groupId },
      data: { members: { connect: { id: memberId } } },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
  }
}
