import { Injectable } from '@nestjs/common';
import { ITaskRepository } from '../../domain/task.repository.interface';
import { Task, TaskStatus } from '../../domain/task.entity';
// Asumsi Prisma sudah di-setup
import { PrismaService } from '../../../../../prisma/prisma.service'; 

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaService) {}

  async save(task: Task, userId?: string): Promise<Task> {
    await this.prisma.task.upsert({
      where: { id: task.id },
      update: { 
        title: task.title, 
        status: task.status,
        deadline: task.deadline,
        priority: task.priority,
        userId: userId || undefined,
      },
      create: {
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        priority: task.priority,
        status: task.status,
        userId: userId || undefined,
      },
    });
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    const data = await this.prisma.task.findUnique({ where: { id } });
    if (!data) return null;
    return new Task(data.id, data.title, data.deadline, data.priority, data.status as TaskStatus);
  }

  async findAll(userId?: string): Promise<Task[]> {
    const where = userId ? { userId } : {};
    const list = await this.prisma.task.findMany({ where });
    return list.map(t => new Task(t.id, t.title, t.deadline, t.priority, t.status as TaskStatus));
  }
}