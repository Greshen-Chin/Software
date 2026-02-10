<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSocialStore } from '../stores/socialStore';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chatStore';
import { useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Users,
  Settings,
  LogOut,
  UserPlus,
  MessageCircle,
  ArrowLeft,
  UserRound,
} from 'lucide-vue-next';

const socialStore = useSocialStore();
const authStore = useAuthStore();
const chatStore = useChatStore();
const router = useRouter();

const isProfileOpen = ref(false);
const isSettingsOpen = ref(false);
const isGroupCreateOpen = ref(false);
const newGroupName = ref('');
const themeMode = ref(localStorage.getItem('theme') || 'light');
const friendQuery = ref('');
const friendResults = ref([]);
const friendWarning = ref('');
const friendCodeInput = ref('');
const activeTab = ref('friends');
const activeView = ref('list'); // list | dm
const dmMessageText = ref('');
const profileUser = ref(null);
const selectedGroupId = ref('');
const canCreateSchedule = ref(false);
const currentUserId = computed(() => authStore.user?.id);

const friends = computed(() => socialStore.friends);
const requests = ref([]);
const sentRequests = ref([]);
const groups = computed(() => socialStore.groups || []);
const dmMessages = computed(() => chatStore.dmMessages);
const activeDMUser = computed(() =>
  socialStore.friends.find((f) => f.id === chatStore.activeDMUserId),
);

const loadRequests = async () => {
  requests.value = await socialStore.getFriendRequests();
  sentRequests.value = await socialStore.getSentFriendRequests();
};

const searchFriends = async () => {
  if (!friendQuery.value.trim()) {
    friendResults.value = [];
    friendWarning.value = '';
    return;
  }
  const q = friendQuery.value.trim();
  if (authStore.user?.name && q.toLowerCase() === authStore.user.name.toLowerCase()) {
    friendResults.value = [];
    friendWarning.value = 'Nama ini sama dengan nama kamu. Gunakan userCode untuk tambah teman.';
    return;
  }
  friendWarning.value = '';
  friendResults.value = await socialStore.searchUsersByName(q);
};

const sendFriendRequest = async (userCode) => {
  const code = (userCode || '').trim().toUpperCase();
  if (!code) return;
  try {
    await socialStore.requestFriendByCode(code);
    await loadRequests();
    friendCodeInput.value = '';
    friendWarning.value = '';
  } catch (error) {
    friendWarning.value =
      error?.response?.data?.message || error?.message || 'Gagal mengirim request';
  }
};

const sendRequestByResult = async (userCode) => {
  await sendFriendRequest(userCode);
  friendResults.value = [];
  friendQuery.value = '';
};

const acceptRequest = async (id) => {
  await socialStore.acceptFriendRequest(id);
  await socialStore.fetchFriends();
  await loadRequests();
};

const rejectRequest = async (id) => {
  await socialStore.rejectFriendRequest(id);
  await loadRequests();
};

const openDM = async (userId) => {
  await chatStore.openDM(userId);
  activeView.value = 'dm';
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const sendDM = () => {
  if (!dmMessageText.value.trim()) return;
  chatStore.sendDMMessage(dmMessageText.value.trim());
  dmMessageText.value = '';
};

const openProfile = (user) => {
  profileUser.value = user;
  isProfileOpen.value = true;
};

const inviteToGroup = async () => {
  if (!profileUser.value || !selectedGroupId.value) return;
  await socialStore.addGroupMember(selectedGroupId.value, profileUser.value.id, canCreateSchedule.value);
  selectedGroupId.value = '';
  canCreateSchedule.value = false;
  isProfileOpen.value = false;
};

const createGroup = async () => {
  if (!newGroupName.value.trim()) return;
  await socialStore.createGroup(newGroupName.value.trim());
  await socialStore.fetchGroups();
  newGroupName.value = '';
  isGroupCreateOpen.value = false;
};

const toggleTheme = () => {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', themeMode.value);
  document.body.classList.toggle('theme-dark', themeMode.value === 'dark');
};

onMounted(async () => {
  await socialStore.fetchFriends();
  await socialStore.fetchGroups();
  await loadRequests();
  chatStore.connect();
  document.body.classList.toggle('theme-dark', themeMode.value === 'dark');
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
          <div class="mt-4 space-y-2">
            <button
              @click="isSettingsOpen = true; isProfileOpen = false"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
            >
              <Settings class="w-4 h-4" /> Pengaturan
            </button>
            <button
              @click="toggleTheme"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
            >
              <UserPlus class="w-4 h-4" /> Tema: {{ themeMode === 'dark' ? 'Dark' : 'Light' }}
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
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/friends">
          <Users class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
      </nav>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <header class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div class="flex items-center gap-4">
          <button
            v-if="activeView === 'dm'"
            @click="activeView = 'list'"
            class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-2"
          >
            <ArrowLeft class="w-4 h-4" /> Back
          </button>
          <div>
            <p class="text-sm uppercase font-bold text-slate-400 tracking-widest">
              {{ activeView === 'dm' ? 'Direct Message' : 'Friends' }}
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              {{ activeView === 'dm' ? (activeDMUser?.name || 'Chat') : 'Teman & DM' }}
            </h2>
          </div>
        </div>
        <div v-if="activeView === 'list'" class="flex items-center gap-3">
          <button
            @click="activeTab = 'friends'"
            class="px-4 py-2 rounded-xl text-sm font-bold"
            :class="activeTab === 'friends' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'"
          >
            Friends
          </button>
          <button
            @click="activeTab = 'requests'"
            class="px-4 py-2 rounded-xl text-sm font-bold"
            :class="activeTab === 'requests' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'"
          >
            Requests
          </button>
          <button
            @click="activeTab = 'add'"
            class="px-4 py-2 rounded-xl text-sm font-bold"
            :class="activeTab === 'add' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'"
          >
            Add Friend
          </button>
        </div>
      </header>

      <div v-if="activeView === 'dm'" class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col h-[70vh]">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
              {{ (activeDMUser?.name || 'U')[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-bold text-slate-900">{{ activeDMUser?.name || 'User' }}</p>
              <p class="text-xs text-slate-400">{{ activeDMUser?.bio || 'Belum ada bio.' }}</p>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto space-y-3 pr-2">
            <div
              v-for="msg in dmMessages"
              :key="msg.id"
              class="flex"
              :class="msg.senderId === currentUserId ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[70%] rounded-2xl px-4 py-3"
                :class="msg.senderId === currentUserId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-800'"
              >
                <p class="text-sm">{{ msg.content }}</p>
                <p class="text-[10px] mt-2 opacity-70 text-right">
                  {{ new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <input
              v-model="dmMessageText"
              type="text"
              class="flex-1 rounded-xl bg-slate-100 text-slate-800 text-sm px-3 py-2 outline-none"
              placeholder="Tulis pesan..."
            />
            <button
              @click="sendDM"
              class="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-400"
            >
              Kirim
            </button>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-3">Profil</h3>
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
              {{ (activeDMUser?.name || 'U')[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-bold text-slate-900">{{ activeDMUser?.name || 'User' }}</p>
              <p class="text-xs text-slate-400">{{ activeDMUser?.bio || 'Belum ada bio.' }}</p>
            </div>
          </div>
          <p class="text-sm text-slate-600 mt-4">{{ activeDMUser?.bio || 'Belum ada bio.' }}</p>
          <div class="mt-6 border-t border-slate-100 pt-4">
            <p class="text-xs font-bold text-slate-400 mb-2">Invite ke Grup</p>
            <div class="flex gap-2">
              <select
                v-model="selectedGroupId"
                class="flex-1 border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
              >
                <option value="">Pilih grup</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                <input type="checkbox" v-model="canCreateSchedule" />
                Boleh buat jadwal
              </label>
            </div>
            <button
              @click="inviteToGroup"
              class="mt-3 w-full px-4 py-3 rounded-2xl bg-black text-white font-bold"
            >
              Invite
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'friends'" class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <div
            v-for="f in friends"
            :key="f.id"
            class="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between"
          >
            <div>
              <p class="font-bold text-slate-800">{{ f.name }}</p>
              <p class="text-xs text-slate-400">{{ f.bio || 'Belum ada bio.' }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="openProfile(f)"
                class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2"
              >
                <UserRound class="w-4 h-4" /> Profile
              </button>
              <button
                @click="openDM(f.id)"
                class="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center gap-2"
              >
                <MessageCircle class="w-4 h-4" /> DM
              </button>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4">
          <div class="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 class="font-bold text-slate-800 mb-2">Your Code</h3>
            <p class="text-sm text-slate-500">Bagikan kode ini untuk ditambahkan:</p>
            <div class="mt-3 text-xl font-black text-slate-900 tracking-widest">
              {{ authStore.user?.userCode || '-------' }}
            </div>
            <button
              @click="isGroupCreateOpen = true"
              class="mt-4 w-full px-4 py-3 rounded-2xl bg-black text-white font-bold"
            >
              Buat Grup Baru
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'requests'" class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-6 space-y-4">
          <h3 class="font-bold text-slate-800">Incoming</h3>
          <div
            v-for="r in requests"
            :key="r.id"
            class="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between"
          >
            <div>
              <p class="font-bold text-slate-800">{{ r.sender?.name }}</p>
              <p class="text-xs text-slate-400">Code: {{ r.sender?.userCode }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="acceptRequest(r.id)"
                class="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm"
              >
                Accept
              </button>
              <button
                @click="rejectRequest(r.id)"
                class="px-3 py-2 rounded-xl bg-red-100 text-red-700 font-bold text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-6 space-y-4">
          <h3 class="font-bold text-slate-800">Sent</h3>
          <div
            v-for="r in sentRequests"
            :key="r.id"
            class="bg-white rounded-2xl border border-slate-100 p-4"
          >
            <p class="font-bold text-slate-800">{{ r.receiver?.name }}</p>
            <p class="text-xs text-slate-400">Code: {{ r.receiver?.userCode }}</p>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-3">Tambah via Code</h3>
          <div class="flex gap-2">
            <input
              v-model="friendCodeInput"
              type="text"
              placeholder="Masukkan userCode (7 huruf)"
              class="flex-1 border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none"
            />
            <button
              @click="sendFriendRequest(friendCodeInput.trim())"
              class="px-4 py-3 rounded-2xl bg-black text-white font-bold"
            >
              Add
            </button>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-3">Cari Nama</h3>
          <input
            v-model="friendQuery"
            type="text"
            placeholder="Cari nama teman"
            class="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none"
            @input="searchFriends"
          />
          <p v-if="friendWarning" class="text-xs text-amber-600 mt-2">{{ friendWarning }}</p>
          <div class="mt-4 space-y-2 max-h-56 overflow-y-auto">
            <button
              v-for="u in friendResults"
              :key="u.id"
              @click="sendRequestByResult(u.userCode)"
              class="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
            >
              {{ u.name }} · Code: {{ u.userCode }}
            </button>
            <p v-if="friendQuery && friendResults.length === 0" class="text-xs text-slate-400">
              Tidak ada user ditemukan.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div
    v-if="isProfileOpen && profileUser"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isProfileOpen = false"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-2xl">
          {{ (profileUser.name || 'U')[0]?.toUpperCase() }}
        </div>
        <div>
          <p class="text-xl font-black text-slate-800">{{ profileUser.name }}</p>
          <p class="text-xs text-slate-400">{{ profileUser.bio || 'Belum ada bio.' }}</p>
        </div>
      </div>
      <p class="text-sm text-slate-600 mt-4">{{ profileUser.bio || 'Belum ada bio.' }}</p>
      <div class="mt-6 flex gap-2">
        <button
          @click="openDM(profileUser.id); isProfileOpen = false"
          class="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold"
        >
          DM
        </button>
        <button
          @click="isProfileOpen = false"
          class="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
        >
          Tutup
        </button>
      </div>
      <div class="mt-6 border-t border-slate-100 pt-4">
        <p class="text-xs font-bold text-slate-400 mb-2">Invite ke Grup</p>
        <div class="flex gap-2">
          <select
            v-model="selectedGroupId"
            class="flex-1 border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
          >
            <option value="">Pilih grup</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
            <input type="checkbox" v-model="canCreateSchedule" />
            Boleh buat jadwal
          </label>
        </div>
        <button
          @click="inviteToGroup"
          class="mt-3 w-full px-4 py-3 rounded-2xl bg-black text-white font-bold"
        >
          Invite
        </button>
      </div>
    </div>
  </div>

  <div
    v-if="isGroupCreateOpen"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="isGroupCreateOpen = false"
  >
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-6">Buat Grup Baru</h2>
      <input
        v-model="newGroupName"
        type="text"
        placeholder="Nama grup"
        class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
      />
      <div class="mt-6 flex justify-end gap-2">
        <button
          @click="isGroupCreateOpen = false"
          class="px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
        >
          Batal
        </button>
        <button
          @click="createGroup"
          class="px-6 py-3 rounded-2xl bg-black text-white font-bold"
        >
          Buat
        </button>
      </div>
    </div>
  </div>
</template>


