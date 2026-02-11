<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSocialStore } from '../stores/socialStore';
import { useTaskStore } from '../stores/taskStore';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next';

const scheduleStore = useScheduleStore();
const socialStore = useSocialStore();
const taskStore = useTaskStore();

const currentDate = ref(new Date());
const viewMode = ref<'day' | 'week' | 'month'>('week');
const isModalOpen = ref(false);
const isEditMode = ref(false);
const editingScheduleId = ref<string | null>(null);
const selectedTaskIds = ref<string[]>([]);
const isTaskOpen = ref(false);
const selectedTask = ref<any | null>(null);
const newSchedule = ref({
  title: '',
  startTime: '',
  endTime: '',
  type: 'EVENT',
  importance: 'NORMAL',
  progress: 0,
  description: '',
  groupId: '',
});

const weekStart = computed(() => {
  const date = new Date(currentDate.value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(date.setDate(diff));
});

const weekEnd = computed(() => {
  const date = new Date(weekStart.value);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
});

const weekDays = computed(() => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.value);
    date.setDate(date.getDate() + i);
    days.push(date);
  }
  return days;
});

const timeSlots = computed(() => {
  const slots = [];
  for (let hour = 8; hour < 24; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
});

const getSchedulesForDay = (day: Date) => {
  return scheduleStore.filteredSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.startTime);
    return (
      scheduleDate.getDate() === day.getDate() &&
      scheduleDate.getMonth() === day.getMonth() &&
      scheduleDate.getFullYear() === day.getFullYear()
    );
  });
};

const normalizeDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const weekTasks = computed(() => {
  return taskStore.tasks
    .map((t) => ({
      ...t,
      startDate: normalizeDate(new Date(t.startDate || t.createdAt || t.deadline)),
      endDate: normalizeDate(new Date(t.deadline)),
    }))
    .filter((t) => t.endDate >= weekStart.value && t.startDate <= weekEnd.value)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
});

const miniMonthDays = computed(() => {
  const first = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
  const startDay = first.getDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1 - startDay + i);
    return date;
  });
});

const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const monthRows = computed(() => {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    rows.push(miniMonthDays.value.slice(i * 7, i * 7 + 7));
  }
  return rows;
});

const dayIndexInRow = (date: Date, rowStart: Date) => {
  const d = normalizeDate(new Date(date));
  const start = normalizeDate(new Date(rowStart));
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
};

const dayHasItems = (date: Date) => {
  const hasSchedule = scheduleStore.schedules.some((s) => {
    const d = new Date(s.startTime);
    return isSameDay(d, date);
  });
  const hasTask = taskStore.tasks.some((t) => {
    const d = new Date(t.startDate || t.deadline);
    return isSameDay(d, date);
  });
  return hasSchedule || hasTask;
};

const dayIndex = (date: Date) => {
  const start = normalizeDate(new Date(weekStart.value));
  const d = normalizeDate(new Date(date));
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
};

const taskLanes = computed(() => {
  const lanes: { start: number; end: number; task: any }[][] = [];
  const results: { task: any; lane: number; startCol: number; endCol: number }[] = [];

  for (const task of weekTasks.value) {
    const startCol = Math.max(0, dayIndex(task.startDate));
    let endCol = Math.min(weekDays.value.length - 1, dayIndex(task.endDate));
    if (endCol < startCol) endCol = startCol;

    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const overlap = lane.some((seg) => !(endCol < seg.start || startCol > seg.end));
      if (!overlap) {
        lane.push({ start: startCol, end: endCol, task });
        results.push({ task, lane: i, startCol, endCol });
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([{ start: startCol, end: endCol, task }]);
      results.push({ task, lane: lanes.length - 1, startCol, endCol });
    }
  }
  return { lanesCount: lanes.length, items: results };
});

const monthBarRows = computed(() => {
  const schedules = scheduleStore.schedules.map((s) => ({
    ...s,
    startDate: normalizeDate(new Date(s.startTime)),
    endDate: normalizeDate(new Date(s.endTime)),
  }));

  return monthRows.value.map((row, rowIndex) => {
    const rowStart = row[0];
    const rowEnd = row[6];
    const itemsInRow = schedules
      .filter((s) => s.endDate >= rowStart && s.startDate <= rowEnd)
      .map((s) => {
        const startCol = Math.max(0, dayIndexInRow(s.startDate, rowStart));
        let endCol = Math.min(6, dayIndexInRow(s.endDate, rowStart));
        if (endCol < startCol) endCol = startCol;
        return { schedule: s, startCol, endCol };
      });

    const lanes = [];
    const placed = [];

    for (const item of itemsInRow) {
      let laneIndex = 0;
      let placedInLane = false;
      while (!placedInLane) {
        if (!lanes[laneIndex]) lanes[laneIndex] = [];
        const overlap = lanes[laneIndex].some(
          (seg) => !(item.endCol < seg.startCol || item.startCol > seg.endCol),
        );
        if (!overlap) {
          lanes[laneIndex].push(item);
          placed.push({ ...item, lane: laneIndex });
          placedInLane = true;
        } else {
          laneIndex += 1;
        }
      }
    }

    return {
      rowIndex,
      lanesCount: lanes.length,
      items: placed,
    };
  });
});

const schedulesStartingOn = (date: Date) => {
  const d = normalizeDate(new Date(date));
  return scheduleStore.schedules.filter((s) => {
    const start = normalizeDate(new Date(s.startTime));
    return isSameDay(start, d);
  });
};

const schedulesEndingOn = (date: Date) => {
  const d = normalizeDate(new Date(date));
  return scheduleStore.schedules.filter((s) => {
    const end = normalizeDate(new Date(s.endTime));
    return isSameDay(end, d);
  });
};

const openTask = (task: any) => {
  selectedTask.value = task;
  isTaskOpen.value = true;
};

const recordDoneDate = () => {
  const key = 'doneDates';
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(key);
  const parsed = raw ? JSON.parse(raw) : [];
  const existing = Array.isArray(parsed) ? parsed : [];
  if (!existing.includes(today)) {
    existing.push(today);
    localStorage.setItem(key, JSON.stringify(existing));
  }
  const doneTotal = Number(localStorage.getItem('doneTotal') || '0');
  localStorage.setItem('doneTotal', String(doneTotal + 1));
};

const updateTaskProgress = async (value: number) => {
  if (!selectedTask.value) return;
  if (value >= 100) {
    recordDoneDate();
    await taskStore.deleteTask(selectedTask.value.id);
    await taskStore.fetchTasks();
    isTaskOpen.value = false;
    return;
  }
  await taskStore.updateProgress(selectedTask.value.id, value);
  await taskStore.fetchTasks();
};

const markTaskDone = async () => {
  if (!selectedTask.value) return;
  recordDoneDate();
  await taskStore.deleteTask(selectedTask.value.id);
  await taskStore.fetchTasks();
  isTaskOpen.value = false;
};

const finishSchedule = async () => {
  if (!editingScheduleId.value) return;
  try {
    const payload = {
      ...newSchedule.value,
      progress: 100,
      color: colorFromImportance(newSchedule.value.importance),
      groupId: newSchedule.value.groupId || undefined,
    };
    const res = await scheduleStore.updateSchedule(editingScheduleId.value, payload);
    if (res?.deleted) {
      await scheduleStore.fetchSchedules();
    }
    isModalOpen.value = false;
    resetForm();
  } catch (error: any) {
    alert(error.message || 'Gagal menyelesaikan jadwal');
  }
};

const getSchedulePosition = (schedule: any) => {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  
  // Each hour = 64px (16 hours from 8 AM to 12 AM = 960px total)
  const topPx = (startHour - 8) * 64;
  const heightPx = (endHour - startHour) * 64;
  
  return { 
    top: `${topPx}px`, 
    height: `${heightPx}px`,
    minHeight: heightPx < 40 ? '40px' : undefined
  };
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const navigatePeriod = (direction: number) => {
  const newDate = new Date(currentDate.value);
  if (viewMode.value === 'day') {
    newDate.setDate(newDate.getDate() + direction);
  } else if (viewMode.value === 'week') {
    newDate.setDate(newDate.getDate() + direction * 7);
  } else {
    newDate.setMonth(newDate.getMonth() + direction);
  }
  currentDate.value = newDate;
};

const goToToday = () => {
  currentDate.value = new Date();
};

const formatDateHeader = (date: Date) => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return {
    day: days[date.getDay()],
    date: date.getDate(),
  };
};

const formatMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
});

const formatWeekRange = computed(() => {
  const start = weekDays.value[0];
  const end = weekDays.value[6];
  return `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'short' })} ${end.getFullYear()}`;
});

const displayRange = computed(() => {
  if (viewMode.value === 'day') {
    return currentDate.value.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (viewMode.value === 'month') {
    return formatMonthYear.value;
  }
  return formatWeekRange.value;
});

const getColorClass = (color: string) => {
  const colors: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[color] || colors.purple;
};

const colorFromImportance = (importance: string) => {
  if (importance === 'HIGH') return 'red';
  if (importance === 'LOW') return 'green';
  return 'purple';
};

const resetForm = () => {
  newSchedule.value = {
    title: '',
    startTime: '',
    endTime: '',
    type: 'EVENT',
    importance: 'NORMAL',
    progress: 0,
    description: '',
    groupId: '',
  };
  selectedTaskIds.value = [];
  editingScheduleId.value = null;
  isEditMode.value = false;
};

const openEditSchedule = (schedule: any) => {
  isModalOpen.value = true;
  isEditMode.value = true;
  editingScheduleId.value = schedule.id;
  newSchedule.value = {
    title: schedule.title,
    startTime: schedule.startTime?.slice(0, 16),
    endTime: schedule.endTime?.slice(0, 16),
    type: schedule.type || 'EVENT',
    importance: schedule.importance || 'NORMAL',
    progress: schedule.progress ?? 0,
    description: schedule.description || '',
    groupId: schedule.groupId || '',
  };
  selectedTaskIds.value = taskStore.tasks
    .filter((t) => t.scheduleId === schedule.id)
    .map((t) => t.id);
};

const handleSubmit = async () => {
  if (!newSchedule.value.startTime || !newSchedule.value.endTime) {
    alert('Waktu mulai dan selesai harus diisi');
    return;
  }
  const start = new Date(newSchedule.value.startTime);
  const end = new Date(newSchedule.value.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    alert('Format waktu tidak valid');
    return;
  }
  if (start >= end) {
    alert('Waktu mulai harus sebelum waktu selesai');
    return;
  }
  try {
    const payload = {
      ...newSchedule.value,
      color: colorFromImportance(newSchedule.value.importance),
      groupId: newSchedule.value.groupId || undefined,
    };
    if (isEditMode.value && editingScheduleId.value) {
      const res = await scheduleStore.updateSchedule(editingScheduleId.value, payload);
      if (res?.deleted) {
        await scheduleStore.fetchSchedules();
      }
    } else {
      await scheduleStore.addSchedule(payload);
    }
    isModalOpen.value = false;
    resetForm();
    await taskStore.fetchTasks();
  } catch (error: any) {
    alert(error.message || 'Gagal menambah jadwal');
  }
};

onMounted(() => {
  scheduleStore.fetchSchedules();
  socialStore.fetchGroups();
  taskStore.fetchTasks();
});
</script>

<template>
  <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-3xl font-black text-primary">Calendar</h2>
          <p class="text-slate-500 mt-1">Stay Organized And On Track with Your Personalized Calendar</p>
        </div>
        <button
          @click="resetForm(); isModalOpen = true"
          class="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-xl"
        >
          <Plus class="w-5 h-5" /> New
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-4">
        <button
          @click="scheduleStore.setFilter('ALL')"
          :class="[
            'px-6 py-2 rounded-xl font-bold text-sm transition',
            scheduleStore.filter === 'ALL'
              ? 'bg-black text-white'
              : 'bg-slate-100 muted-text hover:bg-slate-200',
          ]"
        >
          All Scheduled
        </button>
        <button
          @click="scheduleStore.setFilter('EVENT')"
          :class="[
            'px-6 py-2 rounded-xl font-bold text-sm transition',
            scheduleStore.filter === 'EVENT'
              ? 'bg-black text-white'
              : 'bg-slate-100 muted-text hover:bg-slate-200',
          ]"
        >
          Events
        </button>
        <button
          @click="scheduleStore.setFilter('MEETING')"
          :class="[
            'px-6 py-2 rounded-xl font-bold text-sm transition',
            scheduleStore.filter === 'MEETING'
              ? 'bg-black text-white'
              : 'bg-slate-100 muted-text hover:bg-slate-200',
          ]"
        >
          Meetings
        </button>
        <button
          @click="scheduleStore.setFilter('TASK_REMINDER')"
          :class="[
            'px-6 py-2 rounded-xl font-bold text-sm transition',
            scheduleStore.filter === 'TASK_REMINDER'
              ? 'bg-black text-white'
              : 'bg-slate-100 muted-text hover:bg-slate-200',
          ]"
        >
          Task Reminders
        </button>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="navigatePeriod(-1)"
            class="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <button
            @click="goToToday"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition"
          >
            Today
          </button>
          <button
            @click="navigatePeriod(1)"
            class="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
          <span class="font-bold text-lg">{{ displayRange }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="viewMode = 'day'"
            :class="[
              'px-4 py-2 rounded-xl font-bold text-sm transition',
              viewMode === 'day'
                ? 'bg-black text-white'
                : 'bg-slate-100 muted-text hover:bg-slate-200',
            ]"
          >
            Day
          </button>
          <button
            @click="viewMode = 'week'"
            :class="[
              'px-4 py-2 rounded-xl font-bold text-sm transition',
              viewMode === 'week'
                ? 'bg-black text-white'
                : 'bg-slate-100 muted-text hover:bg-slate-200',
            ]"
          >
            Week
          </button>
          <button
            @click="viewMode = 'month'"
            :class="[
              'px-4 py-2 rounded-xl font-bold text-sm transition',
              viewMode === 'month'
                ? 'bg-black text-white'
                : 'bg-slate-100 muted-text hover:bg-slate-200',
            ]"
          >
            Month
          </button>
        </div>

        <div class="text-sm font-bold muted-text">{{ viewMode.toUpperCase() }}</div>
      </div>
    </div>

    <!-- Calendar Grid -->
<div v-if="viewMode === 'week'" class="grid grid-cols-12 gap-6">
  <aside class="col-span-12 lg:col-span-3 space-y-4">
    <div class="card-soft rounded-2xl p-4">
      <div class="flex items-center justify-between mb-3">
        <button @click="navigatePeriod(-1)" class="px-2 py-1 rounded-lg chip-soft">‹</button>
        <p class="text-sm font-bold text-primary">{{ formatMonthYear }}</p>
        <button @click="navigatePeriod(1)" class="px-2 py-1 rounded-lg chip-soft">›</button>
      </div>
      <div class="grid grid-cols-7 text-xs font-bold muted-text mb-2">
        <span v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="text-center">{{ d }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1 text-xs">
        <div
          v-for="d in miniMonthDays"
          :key="d.toISOString()"
          class="text-center py-1 rounded-lg"
          :class="isSameDay(d, new Date()) ? 'bg-amber-200 text-primary font-bold' : 'muted-text'"
        >
          <div>{{ d.getDate() }}</div>
          <div v-if="dayHasItems(d)" class="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto"></div>
        </div>
      </div>
    </div>
    <div class="card-soft rounded-2xl p-4">
      <p class="text-sm font-bold text-primary">Belum ada tugas?</p>
      <p class="text-xs muted-text mt-1">Buat jadwal pertama kamu.</p>
      <button
        @click="resetForm(); isModalOpen = true"
        class="mt-3 w-full px-4 py-3 rounded-2xl bg-amber-300 font-bold text-primary"
      >
        + Buat Jadwal
      </button>
    </div>
    <div class="card-soft rounded-2xl p-4">
      <p class="text-sm font-bold text-primary mb-3">Legend</p>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-400"></span>
          <span class="muted-text">Prioritas</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-400"></span>
          <span class="muted-text">Meeting</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-green-400"></span>
          <span class="muted-text">Bisa Dilewati</span>
        </div>
      </div>
    </div>
  </aside>
  <div class="col-span-12 lg:col-span-9">
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-black text-primary">Timeline Tugas Mingguan</h3>
        <p class="text-xs muted-text">Progress berdasarkan deadline</p>
      </div>
      <div class="card-soft rounded-3xl p-4">
        <div
          class="grid gap-3 auto-rows-[3rem]"
          :style="{ gridTemplateColumns: `120px repeat(${weekDays.length}, minmax(0,1fr))` }"
        >
          <div></div>
          <div
            v-for="d in weekDays"
            :key="d.toISOString()"
            class="text-center text-[10px] muted-text font-bold"
          >
            {{ d.getDate() }}
          </div>

          <template v-if="taskLanes.items.length > 0">
            <template v-for="lane in taskLanes.lanesCount" :key="lane">
              <div class="flex items-center justify-center text-[10px] muted-text font-bold">
                {{ String.fromCharCode(64 + lane) }}
              </div>
              <div class="col-span-full grid items-center min-h-[2.75rem]" :style="{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0,1fr))` }">
                <button
                  v-for="item in taskLanes.items.filter(i => i.lane === lane - 1)"
                  :key="item.task.id"
                  class="h-10 rounded-full flex items-center px-4 text-xs font-bold text-white shadow-md cursor-pointer translate-y-0"
                  :style="{ gridColumnStart: item.startCol + 1, gridColumnEnd: item.endCol + 2 }"
                  :class="item.task.priority === 3 ? 'bg-gradient-to-r from-pink-500 to-orange-400' : item.task.priority === 2 ? 'bg-gradient-to-r from-indigo-500 to-blue-400' : 'bg-gradient-to-r from-emerald-500 to-green-400'"
                  @click="openTask(item.task)"
                >
                  <span class="truncate max-w-[140px]">{{ item.task.title }}</span>
                  <span class="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    {{ item.task.progress || 0 }}%
                  </span>
                </button>
              </div>
            </template>
          </template>
          <div v-else class="col-span-full text-xs muted-text">Tidak ada tugas minggu ini.</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-8 border-b-2 border-slate-200 pb-2 mb-2">
      <div class="text-xs font-bold muted-text uppercase">Time</div>
      <div v-for="day in weekDays" :key="day.toISOString()" class="text-center">
        <div class="text-xs font-bold muted-text uppercase">{{ formatDateHeader(day).day }}</div>
        <div
          class="text-lg font-black mt-1"
          :class="day.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-primary'"
        >
          {{ formatDateHeader(day).date }}
        </div>
      </div>
    </div>

    <div class="relative" style="min-height: 960px;">
      <div class="absolute left-0 top-0 w-20">
        <div
          v-for="hour in Array.from({ length: 16 }, (_, i) => i + 8)"
          :key="hour"
          class="h-16 border-b border-slate-100 flex items-start justify-end pr-4 pt-1"
        >
          <span class="text-xs muted-text">{{ hour.toString().padStart(2, '0') }}:00</span>
        </div>
      </div>

      <div class="ml-20 grid grid-cols-7">
        <div
          v-for="(day, dayIndex) in weekDays"
          :key="dayIndex"
          class="border-l border-slate-100 relative"
          style="min-height: 960px;"
        >
          <div
            v-for="schedule in getSchedulesForDay(day)"
            :key="schedule.id"
            :class="[
              'absolute left-1 right-1 rounded-lg p-2 text-xs font-bold border-2 cursor-pointer hover:shadow-md transition z-10',
              getColorClass(schedule.color),
            ]"
            :style="getSchedulePosition(schedule)"
            @click="openEditSchedule(schedule)"
          >
            <div class="font-bold truncate">{{ schedule.title }}</div>
            <div class="text-[10px] opacity-75 mt-1">
              {{ formatTime(schedule.startTime) }} - {{ formatTime(schedule.endTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Day View -->
    <div v-else-if="viewMode === 'day'" class="overflow-x-auto">
      <div class="min-w-[800px]">
        <div class="grid grid-cols-2 border-b-2 border-slate-200 pb-2 mb-2">
          <div class="text-xs font-bold muted-text uppercase">Time</div>
          <div class="text-center">
            <div class="text-xs font-bold muted-text uppercase">
              {{ formatDateHeader(currentDate).day }}
            </div>
            <div class="text-lg font-black mt-1 text-primary">
              {{ formatDateHeader(currentDate).date }}
            </div>
          </div>
        </div>
        <div class="relative" style="min-height: 960px;">
          <div class="absolute left-0 top-0 w-20">
            <div
              v-for="hour in Array.from({ length: 16 }, (_, i) => i + 8)"
              :key="hour"
              class="h-16 border-b border-slate-100 flex items-start justify-end pr-4 pt-1"
            >
              <span class="text-xs text-slate-500">{{ hour.toString().padStart(2, '0') }}:00</span>
            </div>
          </div>
          <div class="ml-20 border-l border-slate-100 relative" style="min-height: 960px;">
            <div
              v-for="schedule in getSchedulesForDay(currentDate)"
              :key="schedule.id"
              :class="[
                'absolute left-2 right-2 rounded-lg p-2 text-xs font-bold border-2 cursor-pointer hover:shadow-md transition z-10',
                getColorClass(schedule.color),
              ]"
              :style="getSchedulePosition(schedule)"
              @click="openEditSchedule(schedule)"
            >
              <div class="font-bold truncate">{{ schedule.title }}</div>
              <div class="text-[10px] opacity-75 mt-1">
                {{ formatTime(schedule.startTime) }} -
                {{ formatTime(schedule.endTime) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Month View -->
    <div v-else class="card-soft rounded-3xl p-4">
      <div class="grid grid-cols-7 gap-2 text-xs font-bold muted-text uppercase mb-2">
        <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="text-center">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="day in miniMonthDays"
          :key="day.toISOString()"
          class="min-h-[90px] rounded-2xl border border-slate-100 p-2"
        >
          <div class="text-xs font-bold muted-text">{{ day.getDate() }}</div>
          <div class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="s in schedulesStartingOn(day)"
              :key="`start-${s.id}`"
              class="w-2 h-2 rounded-full"
              :class="getColorClass(s.color)"
              title="Mulai"
            ></span>
            <span
              v-for="s in schedulesEndingOn(day)"
              :key="`end-${s.id}`"
              class="w-2 h-2 rounded-full border border-slate-300 bg-white"
              title="Selesai"
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Schedule Modal -->
  <div
    v-if="isModalOpen"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isModalOpen = false; resetForm()"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-6">
        {{ isEditMode ? 'Edit Jadwal' : 'Tambah Jadwal' }}
      </h2>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-xs font-bold uppercase muted-text mb-2">
            Judul
          </label>
          <input
            v-model="newSchedule.title"
            type="text"
            placeholder="Nama kegiatan"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
            required
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase muted-text mb-2">
              Mulai
            </label>
            <input
              v-model="newSchedule.startTime"
              type="datetime-local"
              class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase muted-text mb-2">
              Selesai
            </label>
            <input
              v-model="newSchedule.endTime"
              type="datetime-local"
              class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase muted-text mb-2">
            Tipe
          </label>
          <select
            v-model="newSchedule.type"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
          >
            <option value="EVENT">Event</option>
            <option value="MEETING">Meeting</option>
            <option value="TASK_REMINDER">Task Reminder</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase muted-text mb-2">
            Kepentingan
          </label>
          <select
            v-model="newSchedule.importance"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
          >
            <option value="HIGH">Sangat Penting</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Bisa Dilewati</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase muted-text mb-2">
            Grup (opsional)
          </label>
          <select
            v-model="newSchedule.groupId"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
          >
            <option value="">Pribadi</option>
            <option v-for="g in socialStore.groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase muted-text mb-2">
            Deskripsi Tugas
          </label>
          <textarea
            v-model="newSchedule.description"
            rows="3"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
            placeholder="Tulis deskripsi tugas di sini..."
          ></textarea>
        </div>
        <div class="flex gap-4 mt-8">
          <button
            type="button"
            @click="isModalOpen = false; resetForm()"
            class="flex-1 py-4 font-bold muted-text"
          >
            Batal
          </button>
          <button
            v-if="isEditMode"
            type="button"
            @click="finishSchedule"
            class="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200"
          >
            Finish
          </button>
          <button
            type="submit"
            class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200"
          >
            {{ isEditMode ? 'Simpan Perubahan' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <div
    v-if="isTaskOpen && selectedTask"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isTaskOpen = false"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-2">{{ selectedTask.title }}</h2>
      <p class="text-xs text-slate-500 mb-4">
        {{ new Date(selectedTask.startDate || selectedTask.createdAt).toLocaleDateString('id-ID') }}
        â€“
        {{ new Date(selectedTask.deadline).toLocaleDateString('id-ID') }}
      </p>
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold muted-text uppercase">Progress</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            :value="selectedTask.progress || 0"
            @change="updateTaskProgress(Number($event.target.value))"
            class="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none mt-2"
          />
          <p class="text-xs muted-text mt-1">{{ selectedTask.progress || 0 }}%</p>
        </div>
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
            @click="isTaskOpen = false"
          >
            Tutup
          </button>
          <button
            class="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold"
            @click="markTaskDone"
          >
            Selesai & Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
</template>





