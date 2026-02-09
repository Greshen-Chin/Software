import { Module } from '@nestjs/common';
import { TaskController } from './presentation/task.controller';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { PrismaTaskRepository } from './infrastructure/persistence/prisma-task.repository';
import { TaskReminderService } from './infrastructure/scheduler/task-reminder.service';
import { ITaskRepository } from './domain/task.repository.interface';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [TaskController],
  providers: [
    CreateTaskUseCase,
    TaskReminderService,
    {
      provide: 'ITaskRepository',
      useClass: PrismaTaskRepository,
    },
  ],
  exports: ['ITaskRepository'],
})
export class TaskModule {}
