<script setup>
import { ref } from 'vue';
import WeeklyCalendar from '../components/WeeklyCalendar.vue';
import { LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, MessageCircle } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const isProfileOpen = ref(false);
const isSettingsOpen = ref(false);

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="flex min-h-screen bg-[#F8F9FD]">
    <aside class="w-20 bg-[#FEEF6D] flex flex-col items-center py-8 gap-8 border-r border-black/5 hidden md:flex">
      <div class="relative">
        <button
          @click="isProfileOpen = !isProfileOpen"
          class="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          {{ (authStore.user?.name || 'M')[0]?.toUpperCase() }}
        </button>
        <div
          v-if="isProfileOpen"
          class="absolute left-14 top-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-56 z-20"
        >
          <p class="text-sm font-bold text-slate-800">{{ authStore.user?.name || 'User' }}</p>
          <p class="text-xs text-slate-500 mt-1">{{ authStore.user?.email || '' }}</p>
          <p class="text-[11px] text-slate-400 mt-2">Code: {{ authStore.user?.userCode || '-' }}</p>
          <p class="text-[10px] text-slate-400 mt-1">Gunakan Code untuk tambah teman/DM.</p>
          <div class="mt-4 space-y-2">
            <button
              @click="isSettingsOpen = true; isProfileOpen = false"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
            >
              <Settings class="w-4 h-4" /> Pengaturan
            </button>
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-bold text-red-600"
            >
              <LogOut class="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </div>
      <nav class="flex flex-col gap-6 mt-10 text-slate-700">
        <router-link to="/dashboard">
          <LayoutDashboard class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/calendar">
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
        <router-link to="/friends">
          <MessageCircle class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
      </nav>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <WeeklyCalendar />
    </main>
  </div>

  <div
    v-if="isSettingsOpen"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isSettingsOpen = false"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-6">Pengaturan</h2>
      <div class="space-y-4 text-sm text-slate-600">
        <div class="flex items-center justify-between">
          <span>Notifikasi</span>
          <span class="text-xs font-bold text-slate-400">Aktif</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Mode Fokus</span>
          <span class="text-xs font-bold text-slate-400">Nonaktif</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Sinkronisasi</span>
          <span class="text-xs font-bold text-slate-400">Tersambung</span>
        </div>
      </div>
      <div class="mt-8 flex justify-end">
        <button
          @click="isSettingsOpen = false"
          class="px-6 py-3 rounded-2xl bg-black text-white font-bold hover:bg-slate-800"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>

</template>
