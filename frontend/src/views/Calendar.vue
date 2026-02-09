<script setup>
import WeeklyCalendar from '../components/WeeklyCalendar.vue';
import { LayoutDashboard, Calendar as CalendarIcon, BookOpen, PieChart, Settings } from 'lucide-vue-next';
</script>

<template>
  <div class="flex min-h-screen bg-[#F8F9FD]">
    <aside class="w-20 bg-[#FEEF6D] flex flex-col items-center py-8 gap-8 border-r border-black/5 hidden md:flex">
      <div class="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">M</div>
      <nav class="flex flex-col gap-6 mt-10 text-slate-700">
        <router-link to="/">
          <LayoutDashboard class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/calendar">
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
        <BookOpen class="w-6 h-6 cursor-pointer hover:text-black transition" />
        <PieChart class="w-6 h-6 cursor-pointer hover:text-black transition" />
      </nav>
      <div class="mt-auto">
        <Settings class="w-6 h-6 cursor-pointer text-slate-700 hover:text-black transition" />
      </div>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <WeeklyCalendar />
    </main>
  </div>
</template>
