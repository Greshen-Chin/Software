import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Task, TaskStatus } from '../../domain/task.entity';
import type { ITaskRepository } from '../../domain/task.repository.interface';
import { CreateTaskDto } from '../../presentation/dto/create-task.dto';

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject('ITaskRepository') private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(data: CreateTaskDto, userId: string): Promise<Task> {
    if (!userId) {
      throw new BadRequestException('User ID diperlukan');
    }
    
    if (new Date(data.deadline) < new Date()) {
      throw new BadRequestException("Deadline tidak boleh di masa lalu!");
    }

    const newTask = new Task(
      Math.random().toString(36).substr(2, 9), // Simple ID generator
      data.title,
      new Date(data.deadline),
      data.priority,
      TaskStatus.TODO
    );

    await this.taskRepo.save(newTask, userId);
    return newTask;
  }
}