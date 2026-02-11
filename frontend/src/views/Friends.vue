<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
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
  MessageCircle,
  ArrowLeft,
  UserRound,
} from 'lucide-vue-next';

const socialStore = useSocialStore();
const authStore = useAuthStore();
const chatStore = useChatStore();
const router = useRouter();

const isProfileOpen = ref(false);
const isGroupCreateOpen = ref(false);
const newGroupName = ref('');
const themeMode = ref(localStorage.getItem('theme') || 'light');
const friendQuery = ref('');
const friendResults = ref([]);
const friendWarning = ref('');
const friendCodeInput = ref('');
const activeTab = ref('friends');
const activeView = ref('list'); // list | chat
const activeChatType = ref('dm'); // dm | group
const dmMessageText = ref('');
const groupMessageText = ref('');
const profileUser = ref(null);
const profileData = ref(null);
const profileLoading = ref(false);
const roleActionError = ref('');
const selectedGroupId = ref('');
const groupSearch = ref('');
const memberSearch = ref('');
const selectedMembers = ref([]);
const isGroupInfoOpen = ref(true);
const groupInviteSearch = ref('');
const messageWrap = ref(null);
const isAtBottom = ref(true);
const currentUserId = computed(() => authStore.user?.id);

const friends = computed(() => socialStore.friends);
const requests = ref([]);
const sentRequests = ref([]);
const groups = computed(() => socialStore.groups || []);
const dmMessages = computed(() => chatStore.dmMessages);
const groupMessages = computed(() => chatStore.groupMessages);
const activeGroup = computed(() =>
  socialStore.groups.find((g) => g.id === chatStore.activeGroupId),
);
const isGroupAdmin = computed(() => {
  const group = activeGroup.value;
  const userId = currentUserId.value;
  if (!group || !userId) return false;
  return (group.members || []).some((m) => m.id === userId && m.role === 'ADMIN');
});
const activeDMUser = computed(() =>
  socialStore.friends.find((f) => f.id === chatStore.activeDMUserId),
);
const groupInvites = computed(() => socialStore.groupInvites || []);

const filteredGroups = computed(() => {
  const q = groupSearch.value.trim().toLowerCase();
  if (!q) return groups.value;
  return groups.value.filter((g) => g.name.toLowerCase().includes(q));
});

const filteredFriendsForDm = computed(() => {
  const q = groupSearch.value.trim().toLowerCase();
  if (!q) return friends.value;
  return friends.value.filter((f) => f.name.toLowerCase().includes(q));
});

const filteredFriendsForInvite = computed(() => {
  const q = memberSearch.value.trim().toLowerCase();
  if (!q) return friends.value;
  return friends.value.filter((f) => f.name.toLowerCase().includes(q));
});

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
  if (!id) return;
  await socialStore.acceptFriendRequest(id);
  await socialStore.fetchFriends();
  await loadRequests();
};

const rejectRequest = async (id) => {
  if (!id) return;
  await socialStore.rejectFriendRequest(id);
  await loadRequests();
};

const openDM = async (userId) => {
  await chatStore.openDM(userId);
  activeView.value = 'chat';
  activeChatType.value = 'dm';
};

const openGroup = async (groupId) => {
  await chatStore.openGroup(groupId);
  activeView.value = 'chat';
  activeChatType.value = 'group';
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

const sendGroup = () => {
  if (!groupMessageText.value.trim()) return;
  chatStore.sendGroupMessage(groupMessageText.value.trim());
  groupMessageText.value = '';
};

const updateScrollState = (e) => {
  const el = e?.target;
  if (!el) return;
  const threshold = 40;
  isAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
};

const scrollToBottom = async () => {
  await nextTick();
  const el = messageWrap.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const openProfile = async (user) => {
  profileUser.value = user;
  isProfileOpen.value = true;
  await loadProfile(user.id);
};

const loadProfile = async (userId, groupId) => {
  profileLoading.value = true;
  roleActionError.value = '';
  try {
    profileData.value = await socialStore.getUserProfile(userId, groupId);
  } finally {
    profileLoading.value = false;
  }
};

const openProfileFromChat = async (userId) => {
  profileUser.value = { id: userId };
  isProfileOpen.value = true;
  const groupId = activeChatType.value === 'group' ? activeGroup.value?.id : undefined;
  await loadProfile(userId, groupId);
};

const sendFriendRequestById = async (userId) => {
  try {
    await socialStore.requestFriendById(userId);
    await loadProfile(userId);
    await loadRequests();
  } catch (error) {
    roleActionError.value =
      error?.response?.data?.message || error?.message || 'Gagal mengirim permintaan';
  }
};

const getIncomingRequestId = (userId) => {
  const req = requests.value.find((r) => r.sender?.id === userId);
  return req?.id;
};


const promoteMember = async (userId) => {
  if (!activeGroup.value) return;
  try {
    await socialStore.promoteToModerator(activeGroup.value.id, userId);
    await socialStore.fetchGroups();
    await loadProfile(userId, activeGroup.value.id);
  } catch (error) {
    roleActionError.value =
      error?.response?.data?.message || error?.message || 'Gagal promote';
  }
};

const demoteMember = async (userId) => {
  if (!activeGroup.value) return;
  try {
    await socialStore.demoteToMember(activeGroup.value.id, userId);
    await socialStore.fetchGroups();
    await loadProfile(userId, activeGroup.value.id);
  } catch (error) {
    roleActionError.value =
      error?.response?.data?.message || error?.message || 'Gagal demote';
  }
};

const transferAdminTo = async (userId) => {
  if (!activeGroup.value) return;
  if (userId === currentUserId.value) {
    roleActionError.value = 'Tidak bisa transfer ke diri sendiri';
    return;
  }
  try {
    await socialStore.transferAdmin(activeGroup.value.id, userId);
    await socialStore.fetchGroups();
    await loadProfile(userId, activeGroup.value.id);
  } catch (error) {
    roleActionError.value =
      error?.response?.data?.message || error?.message || 'Gagal transfer admin';
  }
};

const removeFromGroup = async (userId) => {
  if (!activeGroup.value) return;
  try {
    await socialStore.removeGroupMember(activeGroup.value.id, userId);
    await socialStore.fetchGroups();
    isProfileOpen.value = false;
  } catch (error) {
    roleActionError.value =
      error?.response?.data?.message || error?.message || 'Gagal remove member';
  }
};

const inviteToGroup = async () => {
  if (!profileUser.value || !selectedGroupId.value) return;
  try {
    await socialStore.sendGroupInvite(selectedGroupId.value, profileUser.value.id);
    selectedGroupId.value = '';
    isProfileOpen.value = false;
  } catch (error) {
    friendWarning.value =
      error?.response?.data?.message || error?.message || 'Gagal mengundang ke grup';
  }
};

const createGroup = async () => {
  if (!newGroupName.value.trim()) return;
  const created = await socialStore.createGroup(newGroupName.value.trim());
  for (const member of selectedMembers.value) {
    await socialStore.sendGroupInvite(created.id, member.id);
  }
  await socialStore.fetchGroups();
  await openGroup(created.id);
  chatStore.groupMessages.push({
    id: `system-${Date.now()}`,
    content: 'Group berhasil dibuat',
    createdAt: new Date().toISOString(),
    senderId: currentUserId.value,
    system: true,
  });
  newGroupName.value = '';
  selectedMembers.value = [];
  memberSearch.value = '';
  isGroupCreateOpen.value = false;
};

const toggleMember = (member) => {
  const exists = selectedMembers.value.find((m) => m.id === member.id);
  if (exists) {
    selectedMembers.value = selectedMembers.value.filter((m) => m.id !== member.id);
  } else {
    selectedMembers.value = [...selectedMembers.value, member];
  }
};

const removeMember = (id) => {
  selectedMembers.value = selectedMembers.value.filter((m) => m.id !== id);
};

const acceptGroupInvite = async (id) => {
  await socialStore.acceptGroupInvite(id);
  await socialStore.fetchGroupInvites();
  await socialStore.fetchGroups();
};

const rejectGroupInvite = async (id) => {
  await socialStore.rejectGroupInvite(id);
  await socialStore.fetchGroupInvites();
};


onMounted(async () => {
  await socialStore.fetchFriends();
  await socialStore.fetchGroups();
  await socialStore.fetchGroupInvites();
  await loadRequests();
  chatStore.connect();
  document.body.classList.toggle('theme-dark', themeMode.value === 'dark');
});

watch([dmMessages, groupMessages], async () => {
  if (isAtBottom.value) {
    await scrollToBottom();
  }
});
</script>

<template>
  <div class="flex min-h-screen bg-[#F3F4F8]">
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
            v-if="activeView === 'chat'"
            @click="activeView = 'list'"
            class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-2"
          >
            <ArrowLeft class="w-4 h-4" /> Back
          </button>
          <div>
            <p class="text-sm uppercase font-bold text-slate-400 tracking-widest">
              {{ activeView === 'chat' ? (activeChatType === 'group' ? 'Group Chat' : 'Direct Message') : 'Friends' }}
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              {{
                activeView === 'chat'
                  ? activeChatType === 'group'
                    ? (activeGroup?.name || 'Group')
                    : (activeDMUser?.name || 'Chat')
                  : 'Teman & DM'
              }}
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

      <div v-if="activeView === 'chat'" class="grid grid-cols-12 gap-6">
        <aside class="col-span-12 lg:col-span-3 card-soft rounded-2xl p-4 flex flex-col h-[70vh]">
          <div class="flex items-center gap-2">
            <input
              v-model="groupSearch"
              type="text"
              class="input-soft w-full rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="Cari grup atau DM..."
            />
          </div>
          <button
            @click="isGroupCreateOpen = true"
            class="mt-3 w-full rounded-xl bg-amber-300 text-slate-900 font-bold py-2 text-sm"
          >
            + Buat Group
          </button>

          <div class="mt-5 text-[11px] font-bold muted-text uppercase">Groups</div>
          <div class="mt-2 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="g in filteredGroups"
              :key="g.id"
              @click="openGroup(g.id)"
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition"
              :class="chatStore.activeGroupId === g.id ? 'bg-slate-100 font-bold' : 'text-slate-700'"
            >
              <div class="text-sm">{{ g.name }}</div>
              <div class="text-[11px] muted-text truncate">Belum ada pesan</div>
            </button>
            <p v-if="filteredGroups.length === 0" class="text-xs muted-text mt-2">Belum ada grup.</p>
          </div>

          <div class="mt-5 text-[11px] font-bold muted-text uppercase">Direct Messages</div>
          <div class="mt-2 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="f in filteredFriendsForDm"
              :key="f.id"
              @click="openDM(f.id)"
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition"
              :class="chatStore.activeDMUserId === f.id ? 'bg-slate-100 font-bold' : 'text-slate-700'"
            >
              <div class="text-sm">{{ f.name }}</div>
              <div class="text-[11px] muted-text truncate">Mulai chat</div>
            </button>
            <p v-if="filteredFriendsForDm.length === 0" class="text-xs muted-text mt-2">Belum ada teman.</p>
          </div>
        </aside>

        <section class="col-span-12 lg:col-span-6 card-soft rounded-2xl flex flex-col h-[70vh]">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-primary overflow-hidden">
              <img
                v-if="activeChatType === 'group' ? activeGroup?.avatarUrl : activeDMUser?.avatarUrl"
                :src="activeChatType === 'group' ? activeGroup?.avatarUrl : activeDMUser?.avatarUrl"
                alt="avatar"
                class="w-full h-full object-cover"
              />
              {{
                activeChatType === 'group'
                  ? (activeGroup?.name || 'G')[0]?.toUpperCase()
                  : (activeDMUser?.name || 'U')[0]?.toUpperCase()
              }}
            </div>
            <div>
              <p class="font-bold text-primary">
                {{ activeChatType === 'group' ? (activeGroup?.name || 'Group') : (activeDMUser?.name || 'User') }}
              </p>
              <p class="text-xs muted-text">
                {{ activeChatType === 'group' ? 'Group chat' : (activeDMUser?.bio || 'Belum ada bio.') }}
              </p>
            </div>
          </div>

          <div
            ref="messageWrap"
            class="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            @scroll="updateScrollState"
          >
            <div
              v-for="msg in (activeChatType === 'group' ? groupMessages : dmMessages)"
              :key="msg.id"
              class="flex"
              :class="msg.senderId === currentUserId ? 'justify-end' : 'justify-start'"
            >
              <div v-if="msg.system" class="w-full text-center text-xs muted-text py-2">
                {{ msg.content }}
              </div>
              <template v-else>
              <button
                v-if="msg.senderId !== currentUserId"
                class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-primary mr-2 mt-1 cursor-pointer overflow-hidden"
                @click="openProfileFromChat(msg.senderId)"
              >
                <img
                  v-if="msg.sender?.avatarUrl"
                  :src="msg.sender.avatarUrl"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
                <span v-else>
                  {{
                    activeChatType === 'group'
                      ? (msg.sender?.name || 'U')[0]?.toUpperCase()
                      : (activeDMUser?.name || 'U')[0]?.toUpperCase()
                  }}
                </span>
              </button>
              <div
                class="max-w-[70%] rounded-2xl px-4 py-3"
                :class="msg.senderId === currentUserId ? 'chat-bubble-out' : 'chat-bubble-in'"
              >
                <button
                  v-if="activeChatType === 'group' && msg.senderId !== currentUserId"
                  @click="openProfileFromChat(msg.senderId)"
                  class="block text-[11px] font-bold text-slate-500 mb-1 text-left"
                >
                  {{ msg.sender?.name || 'User' }}
                </button>
                <p class="text-sm">{{ msg.content }}</p>
                <p class="text-[10px] mt-2 opacity-70 text-right">
                  {{ new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
              </template>
            </div>

            <div v-if="(activeChatType === 'group' ? groupMessages.length === 0 : dmMessages.length === 0)" class="text-xs muted-text">
              Belum ada pesan. Mulai chat sekarang.
            </div>
          </div>

          <div class="p-3 border-t border-slate-100 bg-white/60">
            <div class="flex gap-2">
              <input
                v-if="activeChatType === 'dm'"
                v-model="dmMessageText"
                @keyup.enter="sendDM"
                type="text"
                class="flex-1 rounded-xl chat-input text-sm px-3 py-2 outline-none"
                placeholder="Tulis pesan..."
              />
              <input
                v-else
                v-model="groupMessageText"
                @keyup.enter="sendGroup"
                type="text"
                class="flex-1 rounded-xl chat-input text-sm px-3 py-2 outline-none"
                placeholder="Tulis pesan..."
              />
              <button
                @click="activeChatType === 'dm' ? sendDM() : sendGroup()"
                class="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-400 min-h-[48px]"
              >
                Kirim
              </button>
            </div>
          </div>
        </section>

        <aside class="col-span-12 lg:col-span-3 card-soft rounded-2xl p-4 h-[70vh] flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-primary">Info</h3>
            <button
              @click="isGroupInfoOpen = !isGroupInfoOpen"
              class="text-xs font-bold muted-text"
            >
              {{ isGroupInfoOpen ? 'Sembunyikan' : 'Tampilkan' }}
            </button>
          </div>
          <div v-if="isGroupInfoOpen" class="space-y-4">
            <div v-if="activeChatType === 'group'">
              <p class="text-xs font-bold muted-text uppercase mb-2">Anggota</p>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div
                  v-for="m in activeGroup?.members || []"
                  :key="m.id"
                  class="flex items-center justify-between text-sm"
                >
                  <button class="flex items-center gap-2" @click="openProfileFromChat(m.id)">
                    <span class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden text-[10px] font-bold text-primary">
                      <img v-if="m.avatarUrl" :src="m.avatarUrl" alt="avatar" class="w-full h-full object-cover" />
                      <span v-else>{{ (m.name || 'U')[0]?.toUpperCase() }}</span>
                    </span>
                    <span class="text-primary font-bold hover:underline">{{ m.name }}</span>
                  </button>
                  <span class="text-[10px] muted-text">{{ m.role }}</span>
                </div>
              </div>
              <div v-if="isGroupAdmin" class="mt-4 border-t border-slate-100 pt-3">
                <p class="text-xs font-bold muted-text uppercase mb-2">Tambah Anggota</p>
                <input
                  v-model="groupInviteSearch"
                  type="text"
                  class="mt-2 input-soft w-full rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="Cari teman..."
                />
                <div class="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  <button
                    v-for="f in filteredFriendsForInvite.filter((f) => f.name.toLowerCase().includes(groupInviteSearch.toLowerCase()))"
                    :key="f.id"
                    @click="profileUser = f; selectedGroupId = activeGroup?.id || ''; inviteToGroup()"
                    class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-sm"
                  >
                    {{ f.name }}
                  </button>
                </div>
              </div>
              <p v-else class="text-xs muted-text mt-4">
                Hanya admin yang bisa menambah anggota.
              </p>
            </div>
            <div v-else>
              <p class="text-xs font-bold muted-text uppercase mb-2">Profil</p>
              <p class="text-sm text-primary font-bold">{{ activeDMUser?.name || 'User' }}</p>
              <p class="text-xs muted-text mt-1">{{ activeDMUser?.bio || 'Belum ada bio.' }}</p>
            </div>
          </div>
        </aside>
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
          <div class="bg-white rounded-2xl border border-slate-100 p-5 mt-4">
            <h3 class="font-bold text-slate-800 mb-3">Grup Kamu</h3>
            <div class="space-y-2 max-h-56 overflow-y-auto">
              <div
                v-for="g in groups"
                :key="g.id"
                class="px-4 py-3 rounded-xl bg-slate-50 text-sm font-bold text-slate-700 flex items-center justify-between"
              >
                <span>{{ g.name }}</span>
                <span class="text-[10px] text-slate-400">{{ g.members?.length || 0 }} anggota</span>
              </div>
              <p v-if="groups.length === 0" class="text-xs text-slate-400">
                Belum ada grup.
              </p>
            </div>
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
          <h3 class="font-bold text-slate-800">Group Invites</h3>
          <div
            v-for="inv in groupInvites"
            :key="inv.id"
            class="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between"
          >
            <div>
              <p class="font-bold text-slate-800">{{ inv.group?.name }}</p>
              <p class="text-xs text-slate-400">Diundang oleh {{ inv.inviter?.name }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="acceptGroupInvite(inv.id)"
                class="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm"
              >
                Accept
              </button>
              <button
                @click="rejectGroupInvite(inv.id)"
                class="px-3 py-2 rounded-xl bg-red-100 text-red-700 font-bold text-sm"
              >
                Reject
              </button>
            </div>
          </div>
          <p v-if="groupInvites.length === 0" class="text-xs text-slate-400">
            Tidak ada undangan grup.
          </p>

          <h3 class="font-bold text-slate-800 mt-8">Sent</h3>
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
      <div v-if="profileLoading" class="text-sm text-slate-500">Memuat profil...</div>
      <div v-else>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-2xl">
            {{ (profileData?.user?.name || 'U')[0]?.toUpperCase() }}
          </div>
          <div>
            <p class="text-xl font-black text-slate-800">{{ profileData?.user?.name || 'User' }}</p>
            <p class="text-xs text-slate-400">{{ profileData?.user?.bio || 'Belum ada bio.' }}</p>
            <p class="text-[11px] text-slate-400 mt-1">
              Bergabung: {{ profileData?.user?.createdAt ? new Date(profileData.user.createdAt).toLocaleDateString('id-ID') : '-' }}
            </p>
          </div>
        </div>
        <p class="text-sm text-slate-600 mt-4">{{ profileData?.user?.bio || 'Belum ada bio.' }}</p>
        <div v-if="profileData?.groupInfo" class="mt-4 text-xs text-slate-500">
          Role: {{ profileData.groupInfo.role }} · Joined: {{ new Date(profileData.groupInfo.joinedAt).toLocaleDateString('id-ID') }}
        </div>

        <div class="mt-6 flex gap-2">
          <button
            v-if="profileData?.relationship === 'FRIEND'"
            @click="openDM(profileData.user.id); isProfileOpen = false"
            class="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold"
          >
            Send Message
          </button>
          <button
            v-else-if="profileData?.relationship === 'NONE'"
            @click="sendFriendRequestById(profileData.user.id)"
            class="flex-1 px-4 py-3 rounded-2xl bg-black text-white font-bold"
          >
            Add Friend
          </button>
          <template v-else-if="profileData?.relationship === 'PENDING_RECEIVED'">
            <button
              @click="acceptRequest(getIncomingRequestId(profileData.user.id)); isProfileOpen = false"
              class="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold"
            >
              Accept
            </button>
            <button
              @click="rejectRequest(getIncomingRequestId(profileData.user.id)); isProfileOpen = false"
              class="flex-1 px-4 py-3 rounded-2xl bg-red-100 text-red-700 font-bold"
            >
              Reject
            </button>
          </template>
          <button
            v-else-if="profileData?.relationship === 'PENDING_SENT'"
            class="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
            disabled
          >
            Pending
          </button>
          <button
            @click="isProfileOpen = false"
            class="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
          >
            Tutup
          </button>
        </div>

        <div v-if="profileData?.groupInfo" class="mt-6 border-t border-slate-100 pt-4">
          <p class="text-xs font-bold text-slate-400 mb-2">Group Role</p>
          <p class="text-sm text-slate-700">
            Role: {{ profileData.groupInfo.role }} · Joined:
            {{ new Date(profileData.groupInfo.joinedAt).toLocaleDateString('id-ID') }}
          </p>

          <div v-if="isGroupAdmin && profileData.user?.id !== currentUserId" class="mt-4">
            <p class="text-xs font-bold text-slate-400 mb-2">Manage Member</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="profileData.groupInfo.role === 'MEMBER'"
                @click="promoteMember(profileData.user.id)"
                class="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Promote to Moderator
              </button>
              <button
                v-if="profileData.groupInfo.role === 'MODERATOR'"
                @click="demoteMember(profileData.user.id)"
                class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Demote to Member
              </button>
              <button
                v-if="profileData.groupInfo.role !== 'ADMIN'"
                @click="transferAdminTo(profileData.user.id)"
                class="px-3 py-2 rounded-xl bg-amber-400 text-slate-900 text-xs font-bold"
              >
                Transfer Admin
              </button>
              <button
                v-if="profileData.groupInfo.role !== 'ADMIN'"
                @click="removeFromGroup(profileData.user.id)"
                class="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold"
              >
                Remove
              </button>
            </div>
            <p v-if="roleActionError" class="text-xs text-amber-600 mt-2">{{ roleActionError }}</p>
          </div>
        </div>

        <div v-if="isGroupAdmin" class="mt-6 border-t border-slate-100 pt-4">
          <p class="text-xs font-bold text-slate-400 mb-2">Invite ke Grup</p>
          <div class="flex gap-2">
            <select
              v-model="selectedGroupId"
              class="flex-1 border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">Pilih grup</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <button
            @click="inviteToGroup"
            class="mt-3 w-full px-4 py-3 rounded-2xl bg-black text-white font-bold"
          >
            Invite
          </button>
          <p v-if="friendWarning" class="text-xs text-amber-600 mt-2">{{ friendWarning }}</p>
        </div>
        <p v-else class="text-xs muted-text mt-4">Hanya admin yang bisa mengundang.</p>
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
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-500 mb-2">Nama Grup</label>
          <input
            v-model="newGroupName"
            type="text"
            placeholder="Nama grup"
            class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 mb-2">Pilih Anggota</label>
          <input
            v-model="memberSearch"
            type="text"
            placeholder="Cari teman..."
            class="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-indigo-500 outline-none text-sm"
          />
          <div class="mt-3 max-h-40 overflow-y-auto space-y-2">
            <button
              v-for="f in filteredFriendsForInvite"
              :key="f.id"
              @click="toggleMember(f)"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
            >
              <span>{{ f.name }}</span>
              <span class="text-xs text-slate-400">
                {{ selectedMembers.find((m) => m.id === f.id) ? 'Dipilih' : 'Tambah' }}
              </span>
            </button>
          </div>
          <div v-if="selectedMembers.length" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="m in selectedMembers"
              :key="m.id"
              class="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-2"
            >
              {{ m.name }}
              <button @click="removeMember(m.id)" class="text-xs font-bold">×</button>
            </span>
          </div>
        </div>
      </div>
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
