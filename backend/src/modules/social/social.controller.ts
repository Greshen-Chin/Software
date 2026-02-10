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
      include: { friend: { select: { id: true, name: true, userCode: true, bio: true } } },
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
    const friendIds = await this.prisma.userFriend.findMany({
      where: { userId: user.sub },
      select: { friendId: true },
    });
    const excludeIds = [user.sub, ...friendIds.map((f) => f.friendId)];
    const users = await this.prisma.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
        id: { notIn: excludeIds },
      },
      select: { id: true, name: true, userCode: true, bio: true },
      take: 50,
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
    const friendIds = await this.prisma.userFriend.findMany({
      where: { userId: user.sub },
      select: { friendId: true },
    });
    const excludeIds = [user.sub, ...friendIds.map((f) => f.friendId)];
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { userCode: { contains: q, mode: 'insensitive' } },
        ],
        id: { notIn: excludeIds },
      },
      select: { id: true, name: true, userCode: true, bio: true },
      take: 50,
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
      select: { id: true, name: true, userCode: true, bio: true },
    });
    if (!userFound || userFound.id === user.sub) {
      return [];
    }
    const alreadyFriend = await this.prisma.userFriend.findFirst({
      where: { userId: user.sub, friendId: userFound.id },
    });
    if (alreadyFriend) {
      return [];
    }
    return [userFound];
  }

  @Post('friends/request')
  async requestFriend(
    @Body('userCode') userCode: string,
    @Body('friendId') friendId: string,
    @CurrentUser() user: any,
  ) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!userCode && !friendId) {
      throw new BadRequestException('userCode atau friendId harus diisi');
    }
    const code = userCode ? userCode.trim().toUpperCase() : '';
    const target = code
      ? await this.prisma.user.findFirst({ where: { userCode: { equals: code, mode: 'insensitive' } } })
      : await this.prisma.user.findUnique({ where: { id: friendId } });
    if (!target) {
      throw new BadRequestException('User tidak ditemukan');
    }
    if (user.sub === target.id) {
      throw new BadRequestException('Tidak bisa menambah diri sendiri sebagai teman');
    }

    const alreadyFriend = await this.prisma.userFriend.findFirst({
      where: { userId: user.sub, friendId: target.id },
    });
    if (alreadyFriend) {
      throw new BadRequestException('Sudah menjadi teman');
    }

    const reverseRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: target.id,
        receiverId: user.sub,
        status: 'PENDING',
      },
    });
    if (reverseRequest) {
      await this.prisma.friendRequest.update({
        where: { id: reverseRequest.id },
        data: { status: 'ACCEPTED' },
      });
      await this.prisma.userFriend.upsert({
        where: { userId_friendId: { userId: target.id, friendId: user.sub } },
        update: {},
        create: { userId: target.id, friendId: user.sub },
      });
      await this.prisma.userFriend.upsert({
        where: { userId_friendId: { userId: user.sub, friendId: target.id } },
        update: {},
        create: { userId: user.sub, friendId: target.id },
      });
      return { ok: true, autoAccepted: true };
    }

    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: user.sub,
        receiverId: target.id,
        status: 'PENDING',
      },
    });
    if (existingRequest) {
      throw new BadRequestException('Permintaan sudah dikirim');
    }

    return await this.prisma.friendRequest.create({
      data: { senderId: user.sub, receiverId: target.id },
      include: {
        receiver: { select: { id: true, name: true, userCode: true, bio: true } },
      },
    });
  }

  @Get('friends/requests')
  async getFriendRequests(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    return await this.prisma.friendRequest.findMany({
      where: { receiverId: user.sub, status: 'PENDING' },
      include: { sender: { select: { id: true, name: true, userCode: true, bio: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('friends/requests/sent')
  async getSentFriendRequests(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    return await this.prisma.friendRequest.findMany({
      where: { senderId: user.sub, status: 'PENDING' },
      include: { receiver: { select: { id: true, name: true, userCode: true, bio: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('friends/requests/:id/accept')
  async acceptFriendRequest(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    const request = await this.prisma.friendRequest.findUnique({ where: { id } });
    if (!request || request.receiverId !== user.sub) {
      throw new BadRequestException('Request tidak ditemukan');
    }
    await this.prisma.friendRequest.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
    await this.prisma.userFriend.upsert({
      where: { userId_friendId: { userId: request.senderId, friendId: request.receiverId } },
      update: {},
      create: { userId: request.senderId, friendId: request.receiverId },
    });
    await this.prisma.userFriend.upsert({
      where: { userId_friendId: { userId: request.receiverId, friendId: request.senderId } },
      update: {},
      create: { userId: request.receiverId, friendId: request.senderId },
    });
    return { ok: true };
  }

  @Post('friends/requests/:id/reject')
  async rejectFriendRequest(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    const request = await this.prisma.friendRequest.findUnique({ where: { id } });
    if (!request || request.receiverId !== user.sub) {
      throw new BadRequestException('Request tidak ditemukan');
    }
    await this.prisma.friendRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    return { ok: true };
  }

  @Delete('friends/:friendId')
  async removeFriend(@Param('friendId') friendId: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    await this.prisma.userFriend.deleteMany({
      where: { userId: user.sub, friendId },
    });
    await this.prisma.userFriend.deleteMany({
      where: { userId: friendId, friendId: user.sub },
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
