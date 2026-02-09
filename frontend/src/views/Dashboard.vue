<script setup>
import { ref, onMounted } from 'vue';
import { useTaskStore } from '../stores/taskStore';
import TaskCard from '../components/TaskCard.vue';
import TaskModal from '../components/TaskModal.vue';
import Statistics from '../components/Statistics.vue';
import { 
  LayoutDashboard, BookOpen, Calendar as CalendarIcon, 
  Settings, Bell, Search, Plus, PieChart
} from 'lucide-vue-next';

const store = useTaskStore();
const isModalOpen = ref(false);

onMounted(() => store.fetchTasks());
</script>

<template>
  <div class="flex min-h-screen bg-[#F8F9FD]">
    <aside class="w-20 bg-[#FEEF6D] flex flex-col items-center py-8 gap-8 border-r border-black/5 hidden md:flex">
      <div class="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">M</div>
      <nav class="flex flex-col gap-6 mt-10 text-slate-700">
        <router-link to="/">
          <LayoutDashboard class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
        <router-link to="/calendar">
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <BookOpen class="w-6 h-6 cursor-pointer hover:text-black transition" />
        <PieChart class="w-6 h-6 cursor-pointer hover:text-black transition" />
      </nav>
      <div class="mt-auto">
        <Settings class="w-6 h-6 cursor-pointer text-slate-700 hover:text-black transition" />
      </div>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <header class="flex justify-between items-center mb-10">
        <div class="relative w-96">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari tugas, matkul, atau jadwal..." class="w-full bg-white border-none rounded-2xl py-3 pl-12 pr-4 shadow-sm outline-none focus:ring-2 ring-indigo-500/20" />
        </div>
        <div class="flex items-center gap-4">
          <div class="bg-white p-3 rounded-xl shadow-sm cursor-pointer relative">
            <Bell class="w-5 h-5 text-slate-600" />
            <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </div>
          <button @click="isModalOpen = true" class="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-xl">
            <Plus class="w-5 h-5" /> Tambah Task
          </button>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6">
        
        <div class="col-span-12 lg:col-span-8 space-y-6">
          <div class="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center overflow-hidden relative">
            <div class="relative z-10">
              <h2 class="text-3xl font-black text-slate-900 mb-2">Halo, Mahasiswa! 👋</h2>
              <p class="text-slate-500">Kamu punya <span class="text-indigo-600 font-bold">{{ store.stats.pending }} tugas</span> yang butuh perhatian hari ini.</p>
            </div>
            <div class="hidden sm:block absolute -right-4 -bottom-4 opacity-10">
               <BookOpen :size="200" />
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex justify-between items-center px-2">
              <h3 class="text-xl font-bold text-slate-800">Tugas Mingguan</h3>
              <span class="text-indigo-600 font-bold text-sm cursor-pointer">Lihat Semua</span>
            </div>
            <div v-if="store.tasks.length === 0" class="bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-3xl p-16 text-center">
              <p class="text-indigo-400 font-medium">Belum ada tugas akademik. Saatnya santai sejenak?</p>
            </div>
            <TaskCard 
              v-for="task in store.tasks" 
              :key="task.id" 
              :task="task" 
              @complete="store.completeTask"
            />
          </div>
        </div>

        <div class="col-span-12 lg:col-span-4 space-y-6">
          <div class="bg-[#2D2D2D] text-white p-6 rounded-[2rem] shadow-xl">
            <h4 class="font-bold text-lg mb-4 flex items-center gap-2">
              <Bell class="w-5 h-5 text-orange-400" /> Urgent Tasks
            </h4>
            <div class="space-y-4">
              <div v-for="t in store.tasks.filter(t => t.priority === 3 && t.status !== 'DONE').slice(0,2)" :key="t.id" class="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/5">
                <p class="font-bold text-sm">{{ t.title }}</p>
                <p class="text-xs text-slate-400 mt-1">Deadline sebentar lagi!</p>
              </div>
              <p v-if="store.tasks.filter(t => t.priority === 3).length === 0" class="text-sm text-slate-400 italic">Tidak ada tugas mendesak.</p>
            </div>
          </div>

          <Statistics />
        </div>

      </div>
    </main>

    <TaskModal :isOpen="isModalOpen" @close="isModalOpen = false" />
  </div>
</template>