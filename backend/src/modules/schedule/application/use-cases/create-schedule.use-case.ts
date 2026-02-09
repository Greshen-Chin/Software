import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { Schedule, ScheduleType, ScheduleColor } from '../../domain/schedule.entity';
import type { IScheduleRepository } from '../../domain/schedule.repository.interface';
import { CreateScheduleDto } from '../../presentation/dto/create-schedule.dto';

@Injectable()
export class CreateScheduleUseCase {
  constructor(
    @Inject('IScheduleRepository') private readonly scheduleRepo: IScheduleRepository,
  ) {}

  async execute(data: CreateScheduleDto, userId: string): Promise<Schedule> {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // Cek konflik dengan jadwal yang sudah ada
    const conflictingSchedules = await this.scheduleRepo.findInTimeRange(
      start,
      end,
      userId,
    );

    if (conflictingSchedules.length > 0) {
      throw new ConflictException(
        'Jadwal bentrok! Jam tersebut sudah terisi kegiatan lain.',
      );
    }

    const newSchedule = new Schedule(
      Math.random().toString(36).substr(2, 9),
      data.title,
      start,
      end,
      data.type || ScheduleType.EVENT,
      data.color || ScheduleColor.PURPLE,
      data.description,
      userId,
      data.groupId,
    );

    return await this.scheduleRepo.save(newSchedule);
  }
}
