<script setup>
import { computed } from 'vue';
import { useTaskStore } from '../stores/taskStore';
import { useScheduleStore } from '../stores/scheduleStore';

const taskStore = useTaskStore();
const scheduleStore = useScheduleStore();

const completionRate = computed(() => {
  const doneTotal = Number(localStorage.getItem('doneTotal') || '0');
  const total = taskStore.tasks.length + doneTotal;
  if (total === 0) return 0;
  return Math.round((doneTotal / total) * 100);
});

const streak = computed(() => {
  const dates = JSON.parse(localStorage.getItem('doneDates') || '[]');
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  let count = 0;
  const today = new Date();
  while (true) {
    const d = new Date(today);
    d.setDate(today.getDate() - count);
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    count += 1;
  }
  return count;
});

const progressAngle = computed(() => {
  return (completionRate.value / 100) * 360;
});

const weekDays = computed(() => {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(start.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
});

const weeklyProgress = computed(() => {
  return weekDays.value.map((date) => {
    const tasks = taskStore.tasks.filter((t) => {
      const d = new Date(t.deadline);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
    const avg = tasks.length
      ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
      : 0;
    return { date, value: avg };
  });
});
</script>

<template>
  <div class="card-soft p-6 rounded-[2rem]">
    <h4 class="font-bold text-slate-800 mb-6 text-xl">Statistik Produktivitas</h4>
    
    <!-- Progress Circle -->
    <div class="flex items-center justify-center h-48 relative mb-6">
      <svg class="w-48 h-48 transform -rotate-90">
        <circle
          cx="96"
          cy="96"
          r="80"
          stroke="#e2e8f0"
          stroke-width="16"
          fill="none"
        />
        <circle
          cx="96"
          cy="96"
          r="80"
          stroke="#6366f1"
          stroke-width="16"
          fill="none"
          stroke-dasharray="502.4"
          :stroke-dashoffset="502.4 - (502.4 * completionRate) / 100"
          stroke-linecap="round"
          class="transition-all duration-500"
        />
      </svg>
      <div class="absolute text-center">
        <span class="text-4xl font-black block text-slate-900">{{ completionRate }}%</span>
        <span class="text-xs text-slate-400 uppercase font-bold">Progress</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-green-50 p-4 rounded-xl text-center border-2 border-green-100">
        <span class="text-xs font-bold text-green-600 block uppercase mb-1">Done</span>
        <span class="text-2xl font-black text-green-700">{{ taskStore.stats.done }}</span>
      </div>
      <div class="bg-red-50 p-4 rounded-xl text-center border-2 border-red-100">
        <span class="text-xs font-bold text-red-600 block uppercase mb-1">Expired</span>
        <span class="text-2xl font-black text-red-700">{{ taskStore.stats.expired }}</span>
      </div>
      <div class="bg-indigo-50 p-4 rounded-xl text-center border-2 border-indigo-100">
        <span class="text-xs font-bold text-indigo-600 block uppercase mb-1">Pending</span>
        <span class="text-2xl font-black text-indigo-700">{{ taskStore.stats.pending }}</span>
      </div>
      <div class="bg-slate-50 p-4 rounded-xl text-center border-2 border-slate-100">
        <span class="text-xs font-bold text-slate-600 block uppercase mb-1">Total</span>
        <span class="text-2xl font-black text-slate-700">{{ taskStore.tasks.length }}</span>
      </div>
    </div>

    <div class="mt-6 pt-6 border-t border-slate-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase">Streak</p>
          <p class="text-2xl font-black text-slate-900">{{ streak }} hari</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold text-slate-400 uppercase">Completion Rate</p>
          <p class="text-2xl font-black text-slate-900">{{ completionRate }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>
