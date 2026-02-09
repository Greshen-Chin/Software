export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  EXPIRED = 'EXPIRED',
}

export class Task {
  constructor(
    public readonly id: string,
    public title: string,
    public deadline: Date,
    public priority: number, // 1: Low, 2: Medium, 3: High
    private _status: TaskStatus,
  ) {
    this.validate();
  }

  private validate() {
    if (this.deadline < new Date() && this._status !== TaskStatus.DONE) {
      this._status = TaskStatus.EXPIRED;
    }
    if (this.title.length < 3) throw new Error("Judul terlalu pendek");
  }

  public get status(): TaskStatus {
    return this._status;
  }

  // Business Logic: Task yang sudah selesai/expired tidak boleh diubah
  public canBeUpdated(): boolean {
    return this._status !== TaskStatus.DONE && this._status !== TaskStatus.EXPIRED;
  }

  public complete() {
    if (this._status === TaskStatus.EXPIRED) throw new Error("Task sudah expired!");
    this._status = TaskStatus.DONE;
  }
}