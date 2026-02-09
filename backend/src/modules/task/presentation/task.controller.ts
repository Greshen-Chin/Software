import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import { ITaskRepository } from '../domain/task.repository.interface';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    @Inject('ITaskRepository') private readonly repo: ITaskRepository,
  ) {}

  @Get()
  async getAll() {
    return await this.repo.findAll();
  }

  @Post()
  async create(@Body() dto: any) {
    return await this.createTask.execute(dto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new Error("Task tidak ditemukan");
    
    // Terapkan Business Rule dari Domain: Task EXPIRED tidak bisa di-DONE-kan
    if (task.status === 'EXPIRED') throw new Error("Task sudah expired!");
    
    task.complete(); // Memanggil logic dari Domain Entity kita di Step 4
    return await this.repo.save(task);
  }
}