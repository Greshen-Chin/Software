<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTaskStore } from '../stores/taskStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSocialStore } from '../stores/socialStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/auth';
import Statistics from '../components/Statistics.vue';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Bell,
  Search,
  Plus,
  MessageCircle,
  Settings,
  LogOut,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const taskStore = useTaskStore();
const scheduleStore = useScheduleStore();
const socialStore = useSocialStore();
const chatStore = useChatStore();
const authStore = useAuthStore();
const router = useRouter();

const activeChatTab = ref('group');
const searchQuery = ref('');
const messageText = ref('');
const memberEmail = ref('');
const memberResults = ref([]);
const selectedGroupId = ref('');
const canCreateSchedule = ref(false);
const isProfileOpen = ref(false);

const upcomingSchedules = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return [...scheduleStore.schedules]
    .filter((s) => !q || s.title?.toLowerCase().includes(q))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);
});

const urgentTasks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const list = taskStore.tasks.filter(t => t.status !== 'DONE' && t.status !== 'EXPIRED');
  return [...list]
    .filter((t) => !q || t.title?.toLowerCase().includes(q))
    .sort((a, b) => {
      const da = new Date(a.deadline).getTime();
      const db = new Date(b.deadline).getTime();
      const daysA = Math.ceil((da - Date.now()) / 86400000);
      const daysB = Math.ceil((db - Date.now()) / 86400000);
      if (daysA !== daysB) return daysA - daysB;
      return (b.priority || 0) - (a.priority || 0);
    })
    .slice(0, 5);
});

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return socialStore.groups;
  return socialStore.groups.filter((g) => g.name?.toLowerCase().includes(q));
});

const filteredFriends = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return socialStore.friends;
  return socialStore.friends.filter((f) => f.name?.toLowerCase().includes(q));
});

const activeDMUser = computed(() => {
  return socialStore.friends.find(f => f.id === chatStore.activeDMUserId);
});

const activeGroup = computed(() => {
  return socialStore.groups.find(g => g.id === chatStore.activeGroupId);
});

const currentUserId = computed(() => authStore.user?.id);

const openGroupChat = async (groupId) => {
  await chatStore.openGroup(groupId);
  activeChatTab.value = 'group';
};

const openDM = async (userId) => {
  await chatStore.openDM(userId);
  activeChatTab.value = 'dm';
};

const sendMessage = () => {
  if (!messageText.value.trim()) return;
  if (activeChatTab.value === 'group') {
    chatStore.sendGroupMessage(messageText.value.trim());
  } else {
    chatStore.sendDMMessage(messageText.value.trim());
  }
  messageText.value = '';
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const daysLeft = (deadline) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const updateTaskProgress = async (task, value) => {
  const progress = Number(value);
  if (Number.isNaN(progress)) return;
  await taskStore.updateProgress(task.id, progress);
};


const searchMembers = async () => {
  if (!memberEmail.value.trim()) {
    memberResults.value = [];
    return;
  }
  memberResults.value = await socialStore.searchUsersByEmail(memberEmail.value.trim());
};

const addMember = async (userId) => {
  if (!selectedGroupId.value) return;
  await socialStore.addGroupMember(selectedGroupId.value, userId, canCreateSchedule.value);
  await socialStore.fetchGroups();
  memberEmail.value = '';
  memberResults.value = [];
};

onMounted(async () => {
  await Promise.all([
    taskStore.fetchTasks(),
    scheduleStore.fetchSchedules(),
    socialStore.fetchGroups(),
    socialStore.fetchFriends(),
  ]);
  chatStore.connect();
  if (chatStore.activeDMUserId) {
    activeChatTab.value = 'dm';
  } else if (chatStore.activeGroupId) {
    activeChatTab.value = 'group';
  }
});
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
          <LayoutDashboard class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
        <router-link to="/calendar">
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/friends">
          <MessageCircle class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
      </nav>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <header class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div class="flex items-center gap-4">
          <div class="relative w-full lg:w-[420px]">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              class="w-full input-soft rounded-2xl py-3 pl-12 pr-4 shadow-sm outline-none focus:ring-2 ring-indigo-500/20"
              placeholder="Cari tugas, jadwal, atau grup..."
            />
          </div>
          <div class="hidden lg:flex items-center gap-2 text-sm font-bold text-slate-500">
            <span>{{ new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long' }) }}</span>
            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>{{ socialStore.groups.length }} grup aktif</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/calendar')"
            class="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-xl"
          >
            <Plus class="w-5 h-5" /> Jadwal Baru
          </button>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6">
        <section class="col-span-12 xl:col-span-8 space-y-6">
          <div class="card-soft rounded-[2.5rem] p-8 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm uppercase font-bold text-slate-400 tracking-widest">Overview</p>
                <h2 class="text-3xl font-black text-slate-900 mt-2">Rencana Minggu Ini</h2>
                <p class="text-slate-500 mt-2">Jadwal personal dan grup dalam satu view.</p>
              </div>
              <button
                @click="router.push('/calendar')"
                class="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Buka Kalender
              </button>
            </div>
            <div class="mt-6 space-y-3">
              <div
                v-for="item in upcomingSchedules"
                :key="item.id"
                class="rounded-2xl p-4 border border-slate-100 bg-gradient-to-br from-white to-slate-50 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p class="font-bold text-slate-900">{{ item.title }}</p>
                  <p class="text-xs text-slate-500 mt-1">
                    {{ new Date(item.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
                    – {{ new Date(item.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                  </p>
                </div>
                <router-link
                  to="/calendar"
                  class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Edit
                </router-link>
              </div>
              <p v-if="upcomingSchedules.length === 0" class="text-sm text-slate-400">
                Belum ada jadwal minggu ini.
              </p>
            </div>
          </div>
          <Statistics />
        </section>

        <aside class="col-span-12 xl:col-span-4 space-y-6">
          <div class="card-soft p-6 rounded-[2rem]">
            <h4 class="font-bold text-lg mb-4 flex items-center gap-2">
              <Bell class="w-5 h-5 text-orange-400" /> Urgent Tasks
            </h4>
            <div class="space-y-3">
              <div
                v-for="t in urgentTasks"
                :key="t.id"
                class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
              >
                <div class="flex items-center justify-between">
                  <p class="font-bold text-sm">{{ t.title }}</p>
                  <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-white/20">
                    {{ daysLeft(t.deadline) }} hari lagi
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1">
                  Deadline: {{ new Date(t.deadline).toLocaleDateString('id-ID') }}
                </p>
                <div class="mt-3">
                  <div class="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                    <span>Progress</span>
                    <span>{{ t.progress || 0 }}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="t.progress || 0"
                    @change="updateTaskProgress(t, $event.target.value)"
                    class="w-full accent-emerald-400"
                  />
                </div>
              </div>
              <p v-if="urgentTasks.length === 0" class="text-sm text-slate-400 italic">
                Tidak ada tugas mendesak.
              </p>
            </div>
          </div>

          <div class="card-soft rounded-[2rem] p-6 min-h-[220px]">
            <h4 class="font-bold text-lg text-slate-900 mb-4">Group Chat</h4>
            <div class="space-y-2">
              <button
                v-for="g in filteredGroups"
                :key="g.id"
                @click="openGroupChat(g.id)"
                class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
              >
                <span>{{ g.name }}</span>
                <span class="text-[10px] text-slate-400">{{ g.members?.length || 0 }} anggota</span>
              </button>
            </div>
          </div>

          <div class="card-soft rounded-[2rem] p-6 min-h-[220px]">
            <h4 class="font-bold text-lg text-slate-900 mb-4">Direct Message</h4>
            <div class="space-y-2">
              <button
                v-for="f in filteredFriends"
                :key="f.id"
                @click="openDM(f.id)"
                class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
              >
                <span>{{ f.name }}</span>
                <span class="text-[10px] text-slate-400">{{ f.bio || 'Belum ada bio.' }}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>

  

</template>



