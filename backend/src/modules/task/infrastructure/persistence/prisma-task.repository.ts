import { Injectable } from '@nestjs/common';
import { ITaskRepository } from '../../domain/task.repository.interface';
import { Task, TaskStatus } from '../../domain/task.entity';
// Asumsi Prisma sudah di-setup
import { PrismaService } from 'src/prisma/prisma.service'; 

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaService) {}

  async save(task: Task): Promise<void> {
    await this.prisma.task.upsert({
      where: { id: task.id },
      update: { title: task.title, status: task.status },
      create: {
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        priority: task.priority,
        status: task.status,
      },
    });
  }

  async findById(id: string): Promise<Task | null> {
    const data = await this.prisma.task.findUnique({ where: { id } });
    if (!data) return null;
    return new Task(data.id, data.title, data.deadline, data.priority, data.status as TaskStatus);
  }

  async findAll(): Promise<Task[]> {
    const list = await this.prisma.task.findMany();
    return list.map(t => new Task(t.id, t.title, t.deadline, t.priority, t.status as TaskStatus));
  }
}