<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSocialStore } from '../stores/socialStore';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next';

const scheduleStore = useScheduleStore();
const socialStore = useSocialStore();

const currentDate = ref(new Date());
const viewMode = ref<'day' | 'week' | 'month'>('week');
const isModalOpen = ref(false);
const newSchedule = ref({
  title: '',
  startTime: '',
  endTime: '',
  type: 'EVENT',
  color: 'purple',
  description: '',
  groupId: '',
});

const weekStart = computed(() => {
  const date = new Date(currentDate.value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(date.setDate(diff));
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
      groupId: newSchedule.value.groupId || undefined,
    };
    await scheduleStore.addSchedule(payload);
    isModalOpen.value = false;
    newSchedule.value = {
      title: '',
      startTime: '',
      endTime: '',
      type: 'EVENT',
      color: 'purple',
      description: '',
      groupId: '',
    };
  } catch (error: any) {
    alert(error.message || 'Gagal menambah jadwal');
  }
};

onMounted(() => {
  scheduleStore.fetchSchedules();
  socialStore.fetchGroups();
});
</script>

<template>
  <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-3xl font-black text-slate-900">Calendar</h2>
          <p class="text-slate-500 mt-1">Stay Organized And On Track with Your Personalized Calendar</p>
        </div>
        <button
          @click="isModalOpen = true"
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
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ]"
          >
            Month
          </button>
        </div>

        <div class="text-sm font-bold text-slate-600">{{ viewMode.toUpperCase() }}</div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div v-if="viewMode === 'week'" class="overflow-x-auto">
      <div class="min-w-[1200px]">
        <!-- Day Headers -->
        <div class="grid grid-cols-8 border-b-2 border-slate-200 pb-2 mb-2">
          <div class="text-xs font-bold text-slate-400 uppercase">Time</div>
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            class="text-center"
          >
            <div class="text-xs font-bold text-slate-400 uppercase">
              {{ formatDateHeader(day).day }}
            </div>
            <div
              class="text-lg font-black mt-1"
              :class="
                day.toDateString() === new Date().toDateString()
                  ? 'text-indigo-600'
                  : 'text-slate-900'
              "
            >
              {{ formatDateHeader(day).date }}
            </div>
          </div>
        </div>

        <!-- Time Slots -->
        <div class="relative" style="min-height: 960px;">
          <!-- Time labels -->
          <div class="absolute left-0 top-0 w-20">
            <div
              v-for="hour in Array.from({ length: 16 }, (_, i) => i + 8)"
              :key="hour"
              class="h-16 border-b border-slate-100 flex items-start justify-end pr-4 pt-1"
            >
              <span class="text-xs text-slate-500">{{ hour.toString().padStart(2, '0') }}:00</span>
            </div>
          </div>

          <!-- Day columns with schedules -->
          <div class="ml-20 grid grid-cols-7">
            <div
              v-for="(day, dayIndex) in weekDays"
              :key="dayIndex"
              class="border-l border-slate-100 relative"
              style="min-height: 960px;"
            >
              <!-- Schedule Blocks -->
              <div
                v-for="schedule in getSchedulesForDay(day)"
                :key="schedule.id"
                :class="[
                  'absolute left-1 right-1 rounded-lg p-2 text-xs font-bold border-2 cursor-pointer hover:shadow-md transition z-10',
                  getColorClass(schedule.color),
                ]"
                :style="getSchedulePosition(schedule)"
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
    </div>

    <!-- Day View -->
    <div v-else-if="viewMode === 'day'" class="overflow-x-auto">
      <div class="min-w-[800px]">
        <div class="grid grid-cols-2 border-b-2 border-slate-200 pb-2 mb-2">
          <div class="text-xs font-bold text-slate-400 uppercase">Time</div>
          <div class="text-center">
            <div class="text-xs font-bold text-slate-400 uppercase">
              {{ formatDateHeader(currentDate).day }}
            </div>
            <div class="text-lg font-black mt-1 text-slate-900">
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
    <div v-else class="bg-white rounded-3xl border border-slate-100 p-4">
      <div class="grid grid-cols-7 gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
        <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="text-center">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="cell in Array.from({ length: 42 }, (_, i) => i)"
          :key="cell"
          class="min-h-[90px] rounded-2xl border border-slate-100 p-2"
        >
          <div class="text-xs font-bold text-slate-500">
            {{ (() => {
              const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const startDay = first.getDay();
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - startDay + cell);
              return date.getDate();
            })() }}
          </div>
          <div class="mt-1 space-y-1">
            <div
              v-for="schedule in (() => {
                const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const startDay = first.getDay();
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - startDay + cell);
                return getSchedulesForDay(date).slice(0, 2);
              })()"
              :key="schedule.id"
              class="text-[10px] rounded-md px-2 py-1 truncate"
              :class="getColorClass(schedule.color)"
            >
              {{ schedule.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Schedule Modal -->
  <div
    v-if="isModalOpen"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isModalOpen = false"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-6">Tambah Jadwal 📅</h2>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
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
            <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
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
            <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
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
          <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
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
          <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
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
          <label class="block text-xs font-bold uppercase text-slate-400 mb-2">
            Warna
          </label>
          <select
            v-model="newSchedule.color"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
          >
            <option value="purple">Purple</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="red">Red</option>
          </select>
        </div>
        <div class="flex gap-4 mt-8">
          <button
            type="button"
            @click="isModalOpen = false"
            class="flex-1 py-4 font-bold text-slate-400"
          >
            Batal
          </button>
          <button
            type="submit"
            class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
