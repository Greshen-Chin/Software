import { Injectable } from '@nestjs/common';

@Injectable()
export class ConflictChecker {
  // Logic untuk mengecek apakah dua rentang waktu bertabrakan
  // Rumus: (StartA < EndB) AND (EndA > StartB)
  public hasConflict(newStart: Date, newEnd: Date, existingSchedules: any[]): boolean {
    return existingSchedules.some(schedule => {
      const startB = new Date(schedule.startTime);
      const endB = new Date(schedule.endTime);
      
      return (newStart < endB && newEnd > startB);
    });
  }
}