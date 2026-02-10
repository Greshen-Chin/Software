import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Inject,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CreateScheduleUseCase } from '../application/use-cases/create-schedule.use-case';
import type { IScheduleRepository } from '../domain/schedule.repository.interface';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import { PrismaService } from '../../../../prisma/prisma.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(
    private readonly createSchedule: CreateScheduleUseCase,
    @Inject('IScheduleRepository')
    private readonly scheduleRepo: IScheduleRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAll(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    return await this.scheduleRepo.findByUserId(user.sub);
  }

  @Post('conflicts')
  async checkConflicts(
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
    @CurrentUser() user: any,
  ) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!startTime || !endTime) {
      throw new BadRequestException('startTime dan endTime harus diisi');
    }
    const conflicts = await this.scheduleRepo.findInTimeRange(
      new Date(startTime),
      new Date(endTime),
      user.sub,
    );
    return { hasConflict: conflicts.length > 0, conflicts };
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (dto.groupId) {
      const member = await this.prisma.groupMember.findFirst({
        where: { groupId: dto.groupId, userId: user.sub },
      });
      if (!member) {
        throw new BadRequestException('Anda bukan anggota grup ini');
      }
      if (member.role !== 'ADMIN' && !member.canCreateSchedule) {
        throw new BadRequestException('Anda tidak memiliki akses membuat jadwal grup');
      }
    }
    return await this.createSchedule.execute(dto, user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    // Verify schedule belongs to user
    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new BadRequestException('Schedule tidak ditemukan');
    }
    if (schedule.userId !== user.sub) {
      throw new BadRequestException('Tidak memiliki akses ke schedule ini');
    }
    await this.scheduleRepo.delete(id);
    return { message: 'Schedule deleted successfully' };
  }
}
