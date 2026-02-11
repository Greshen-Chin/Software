<script setup>
import { ref } from 'vue';
import WeeklyCalendar from '../components/WeeklyCalendar.vue';
import { LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, MessageCircle } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const isProfileOpen = ref(false);

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="flex min-h-screen app-shell">
    <aside class="w-20 bg-[#FEEF6D] flex flex-col items-center py-8 gap-8 border-r border-black/5 hidden md:flex">
      <div class="relative">
        <button
          @click="isProfileOpen = !isProfileOpen"
          class="w-12 h-12 rounded-2xl overflow-hidden bg-black flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          <img
            v-if="authStore.user?.avatarUrl && authStore.user.avatarUrl.startsWith('http')"
            :src="authStore.user.avatarUrl"
            alt="avatar"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (authStore.user?.name || 'M')[0]?.toUpperCase() }}</span>
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
              @click="router.push('/settings'); isProfileOpen = false"
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

  

</template>

