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

  @Post('friends/search-name')
  async searchUsersByName(@Body('name') name: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    const q = (name || '').trim();
    if (!q) {
      throw new BadRequestException('Nama harus diisi');
    }
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
        id: { not: user.sub },
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    return users;
  }

  @Post('friends/search-id')
  async searchUsersById(@Body('id') id: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!id) {
      throw new BadRequestException('ID harus diisi');
    }
    const userFound = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (!userFound || userFound.id === user.sub) {
      return [];
    }
    return [userFound];
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
      where: { members: { some: { userId: user.sub } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.createdAt,
      members: g.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        canCreateSchedule: m.canCreateSchedule,
      })),
    }));
  }

  @Post('groups')
  async createGroup(@Body('name') name: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!name) {
      throw new BadRequestException('Nama grup harus diisi');
    }
    const group = await this.prisma.group.create({
      data: { name },
    });
    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.sub,
        role: 'ADMIN',
        canCreateSchedule: true,
      },
    });
    const members = await this.prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        canCreateSchedule: m.canCreateSchedule,
      })),
    };
  }

  @Post('groups/:groupId/members')
  async addMemberToGroup(
    @Param('groupId') groupId: string,
    @Body('userId') memberId: string,
    @Body('canCreateSchedule') canCreateSchedule: boolean,
    @CurrentUser() user: any,
  ) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!memberId) {
      throw new BadRequestException('userId harus diisi');
    }

    // Verify group exists and current user is admin
    const adminMember = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: user.sub, role: 'ADMIN' },
    });

    if (!adminMember) {
      throw new BadRequestException('Hanya admin yang bisa menambah anggota');
    }

    // Ensure target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: memberId },
    });
    if (!targetUser) {
      throw new BadRequestException('User tidak ditemukan');
    }

    await this.prisma.groupMember.upsert({
      where: { userId_groupId: { userId: memberId, groupId } },
      update: {
        canCreateSchedule: !!canCreateSchedule,
      },
      create: {
        userId: memberId,
        groupId,
        role: 'MEMBER',
        canCreateSchedule: !!canCreateSchedule,
      },
    });

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!group) {
      throw new BadRequestException('Grup tidak ditemukan');
    }

    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        canCreateSchedule: m.canCreateSchedule,
      })),
    };
  }
}
