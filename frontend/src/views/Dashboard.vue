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
const messageText = ref('');
const memberEmail = ref('');
const memberResults = ref([]);
const selectedGroupId = ref('');
const canCreateSchedule = ref(false);
const isSettingsOpen = ref(false);
const isProfileOpen = ref(false);

const upcomingSchedules = computed(() => {
  return [...scheduleStore.schedules]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);
});

const urgentTasks = computed(() =>
  taskStore.tasks.filter(t => t.priority === 3 && t.status !== 'DONE').slice(0, 4),
);

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
  <div class="flex min-h-screen bg-[#F3F4F8]">
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
              type="text"
              class="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-sm outline-none focus:ring-2 ring-indigo-500/20"
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
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 relative overflow-hidden">
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
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="item in upcomingSchedules"
                :key="item.id"
                class="rounded-2xl p-4 border border-slate-100 bg-gradient-to-br from-white to-slate-50 shadow-sm"
              >
                <div class="flex items-center justify-between">
                  <p class="font-bold text-slate-900">{{ item.title }}</p>
                  <span
                    class="text-[10px] font-bold px-2 py-1 rounded-full"
                    :class="item.groupId ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'"
                  >
                    {{ item.groupId ? 'GRUP' : 'PRIBADI' }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-2">
                  {{ new Date(item.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-[#1F1F22] text-white rounded-[2.5rem] p-6 shadow-xl">
              <h3 class="text-lg font-bold flex items-center gap-2">
                <MessageCircle class="w-5 h-5 text-emerald-400" /> Live Chat
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                <span v-if="activeChatTab === 'dm' && activeDMUser">
                  DM dengan {{ activeDMUser.name }}
                </span>
                <span v-else-if="activeChatTab === 'group' && activeGroup">
                  Grup: {{ activeGroup.name }}
                </span>
                <span v-else>
                  Pilih teman atau grup untuk memulai chat.
                </span>
              </p>
              <div class="mt-4 bg-white/10 rounded-2xl p-4 h-72 flex flex-col">
                <div class="flex gap-3 text-xs font-bold text-slate-300 mb-3">
                  <button
                    @click="activeChatTab = 'group'"
                    :class="activeChatTab === 'group' ? 'text-white' : ''"
                  >Group</button>
                  <button
                    @click="activeChatTab = 'dm'"
                    :class="activeChatTab === 'dm' ? 'text-white' : ''"
                  >DM</button>
                </div>
                <div class="flex-1 overflow-y-auto space-y-3 pr-2">
                  <div
                    v-if="activeChatTab === 'group' && !chatStore.activeGroupId"
                    class="text-xs text-slate-300"
                  >
                    Pilih grup untuk memulai chat.
                  </div>
                  <div
                    v-if="activeChatTab === 'dm' && !chatStore.activeDMUserId"
                    class="text-xs text-slate-300"
                  >
                    Pilih teman untuk DM.
                  </div>
                  <div
                    v-for="msg in (activeChatTab === 'group' ? chatStore.groupMessages : chatStore.dmMessages)"
                    :key="msg.id"
                    class="flex"
                    :class="msg.senderId === currentUserId ? 'justify-end' : 'justify-start'"
                  >
                    <div
                      class="max-w-[70%] rounded-2xl px-4 py-3"
                      :class="msg.senderId === currentUserId ? 'bg-emerald-500 text-white' : 'bg-black/30 text-white'"
                    >
                      <p class="text-xs font-bold mb-1">
                        {{ msg.senderId === currentUserId ? 'Kamu' : (msg.sender?.name || 'User') }}
                      </p>
                      <p class="text-sm">{{ msg.content }}</p>
                      <p class="text-[10px] mt-2 opacity-70 text-right">
                        {{ new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-3 flex gap-2">
                  <input
                    v-model="messageText"
                    type="text"
                    class="flex-1 rounded-xl bg-black/30 text-white text-sm px-3 py-2 outline-none"
                    placeholder="Tulis pesan..."
                  />
                  <button
                    @click="sendMessage"
                    class="bg-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-300"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageCircle class="w-5 h-5 text-indigo-500" /> Grup & Akses
              </h3>
              <div class="mt-4 space-y-4">
                <select
                  v-model="selectedGroupId"
                  class="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="">Pilih grup</option>
                  <option v-for="g in socialStore.groups" :key="g.id" :value="g.id">
                    {{ g.name }}
                  </option>
                </select>
                <div class="flex items-center gap-3">
                  <input
                    v-model="memberEmail"
                    type="email"
                    class="flex-1 border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
                    placeholder="Cari email user"
                    @input="searchMembers"
                  />
                  <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <input type="checkbox" v-model="canCreateSchedule" />
                    Boleh buat jadwal
                  </label>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="u in memberResults"
                    :key="u.id"
                    @click="addMember(u.id)"
                    class="w-full text-left px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
                  >
                    {{ u.name }} · {{ u.email }}
                  </button>
                </div>
                <div class="text-xs text-slate-400">
                  Admin bisa menambah anggota dan memberi akses membuat jadwal grup.
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="col-span-12 xl:col-span-4 space-y-6">
          <div class="bg-[#2D2D2D] text-white p-6 rounded-[2rem] shadow-xl">
            <h4 class="font-bold text-lg mb-4 flex items-center gap-2">
              <Bell class="w-5 h-5 text-orange-400" /> Urgent Tasks
            </h4>
            <div class="space-y-3">
              <div
                v-for="t in urgentTasks"
                :key="t.id"
                class="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/5"
              >
                <p class="font-bold text-sm">{{ t.title }}</p>
                <p class="text-xs text-slate-400 mt-1">Deadline sebentar lagi!</p>
              </div>
              <p v-if="urgentTasks.length === 0" class="text-sm text-slate-400 italic">
                Tidak ada tugas mendesak.
              </p>
            </div>
          </div>

          <div class="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h4 class="font-bold text-lg text-slate-900 mb-4">Group Chat</h4>
            <div class="space-y-2">
              <button
                v-for="g in socialStore.groups"
                :key="g.id"
                @click="openGroupChat(g.id)"
                class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
              >
                <span>{{ g.name }}</span>
                <span class="text-[10px] text-slate-400">{{ g.members?.length || 0 }} anggota</span>
              </button>
            </div>
          </div>

          <div class="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h4 class="font-bold text-lg text-slate-900 mb-4">Direct Message</h4>
            <div class="space-y-2">
              <button
                v-for="f in socialStore.friends"
                :key="f.id"
                @click="openDM(f.id)"
                class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
              >
                <span>{{ f.name }}</span>
                <span class="text-[10px] text-slate-400">Code: {{ f.userCode }}</span>
              </button>
            </div>
          </div>

          <Statistics />
        </aside>
      </div>
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


