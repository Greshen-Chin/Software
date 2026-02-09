export enum ScheduleType {
  EVENT = 'EVENT',
  MEETING = 'MEETING',
  TASK_REMINDER = 'TASK_REMINDER',
}

export enum ScheduleColor {
  PURPLE = 'purple',
  BLUE = 'blue',
  GREEN = 'green',
  ORANGE = 'orange',
  RED = 'red',
}

export class Schedule {
  constructor(
    public readonly id: string,
    public title: string,
    public startTime: Date,
    public endTime: Date,
    public type: ScheduleType,
    public color: ScheduleColor,
    public description?: string,
    public userId?: string,
    public groupId?: string,
  ) {
    this.validate();
  }

  private validate() {
    if (this.startTime >= this.endTime) {
      throw new Error('Waktu mulai harus sebelum waktu selesai');
    }
    if (this.title.length < 3) {
      throw new Error('Judul terlalu pendek');
    }
    const duration = this.endTime.getTime() - this.startTime.getTime();
    if (duration < 0) {
      throw new Error('Durasi tidak valid');
    }
  }

  public hasConflict(other: Schedule): boolean {
    return (
      this.startTime < other.endTime &&
      this.endTime > other.startTime &&
      this.id !== other.id
    );
  }

  public getDuration(): number {
    return this.endTime.getTime() - this.startTime.getTime();
  }
}
