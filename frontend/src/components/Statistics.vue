<script setup>
import { computed } from 'vue';
import { useTaskStore } from '../stores/taskStore';

const taskStore = useTaskStore();

const completionRate = computed(() => {
  const total = taskStore.tasks.length || 1;
  return Math.round((taskStore.stats.done / total) * 100);
});

const progressAngle = computed(() => {
  return (completionRate.value / 100) * 360;
});
</script>

<template>
  <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
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

    <!-- Weekly Progress -->
    <div class="mt-6 pt-6 border-t border-slate-100">
      <h5 class="text-sm font-bold text-slate-600 mb-3">Progress Mingguan</h5>
      <div class="space-y-2">
        <div v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day" class="flex items-center gap-3">
          <span class="text-xs font-bold text-slate-400 w-8">{{ day }}</span>
          <div class="flex-1 bg-slate-100 rounded-full h-2">
            <div
              class="bg-indigo-500 h-2 rounded-full transition-all"
              :style="{ width: Math.random() * 100 + '%' }"
            ></div>
          </div>
          <span class="text-xs font-bold text-slate-600 w-8 text-right">
            {{ Math.floor(Math.random() * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
