import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskModule } from './modules/task/task.module';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [PrismaModule, TaskModule, AuthModule, ScheduleModule, SocialModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
