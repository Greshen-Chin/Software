import { Injectable, Inject } from '@nestjs/common';
import { Task, TaskStatus } from '../../domain/task.entity';
import { ITaskRepository } from '../../domain/task.repository.interface';

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject('ITaskRepository') private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(data: { title: string; deadline: Date; priority: number }) {
    if (new Date(data.deadline) < new Date()) {
      throw new Error("Deadline tidak boleh di masa lalu!");
    }

    const newTask = new Task(
      Math.random().toString(36).substr(2, 9), // Simple ID generator
      data.title,
      new Date(data.deadline),
      data.priority,
      TaskStatus.TODO
    );

    return await this.taskRepo.save(newTask);
  }
}