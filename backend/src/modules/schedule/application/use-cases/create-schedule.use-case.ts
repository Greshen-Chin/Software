async execute(data: CreateScheduleDto) {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  // Cari apakah ada jadwal yang overlap
  const existingSchedules = await this.repo.findInTimeRange(start, end);

  if (existingSchedules.length > 0) {
    throw new Error("Jadwal Bentrok! Jam tersebut sudah terisi kegiatan lain.");
  }

  return await this.repo.create(data);
}