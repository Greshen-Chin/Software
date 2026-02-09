import { Controller, Get, Post, Patch, Body, Param, Inject, UseGuards, BadRequestException } from '@nestjs/common';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import type { ITaskRepository } from '../domain/task.repository.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    @Inject('ITaskRepository') private readonly repo: ITaskRepository,
  ) {}

  @Get()
  async getAll(@CurrentUser() user: any) {
    // Return all tasks for now, can filter by userId later if needed
    return await this.repo.findAll();
  }

  @Post()
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    return await this.createTask.execute(dto, user.sub);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    if (!user?.sub) {
      throw new BadRequestException('User tidak terautentikasi');
    }
    if (!status) {
      throw new BadRequestException('Status harus diisi');
    }
    
    const task = await this.repo.findById(id);
    if (!task) {
      throw new BadRequestException("Task tidak ditemukan");
    }
    
    // Terapkan Business Rule dari Domain menggunakan method entity
    try {
      if (status === 'DONE') {
        task.complete();
      } else if (status === 'IN_PROGRESS') {
        task.start();
      } else {
        throw new BadRequestException("Status tidak valid. Gunakan 'DONE' atau 'IN_PROGRESS'");
      }
      
      return await this.repo.save(task, user.sub);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Gagal mengupdate status task');
    }
  }
}