<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, MessageCircle } from 'lucide-vue-next';
import Cropper from 'cropperjs';
import '../assets/cropper.css';

const authStore = useAuthStore();
const router = useRouter();

const name = ref('');
const bio = ref('');
const avatarUrl = ref('');
const avatarFile = ref(null);
const avatarPreview = ref('');
const cropPreview = ref('');
const isCropOpen = ref(false);
const cropImageEl = ref(null);
let cropper = null;
const cropperReady = ref(false);
const themeMode = ref(localStorage.getItem('theme') || 'light');
const saving = ref(false);
const uploading = ref(false);

const loadProfile = () => {
  name.value = authStore.user?.name || '';
  bio.value = authStore.user?.bio || '';
  const url = authStore.user?.avatarUrl || '';
  avatarUrl.value = /^https?:\/\//.test(url) ? url : '';
  avatarPreview.value = '';
  avatarFile.value = null;
  cropPreview.value = '';
};

const saveProfile = async () => {
  saving.value = true;
  try {
    await authStore.updateProfile({
      name: name.value,
      bio: bio.value,
    });
  } finally {
    saving.value = false;
  }
};

const onAvatarChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  avatarFile.value = file;
  cropPreview.value = URL.createObjectURL(file);
  isCropOpen.value = true;
  cropperReady.value = false;
  nextTick(() => {
    if (!cropImageEl.value) return;
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropImageEl.value.onload = () => {
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      cropper = new Cropper(cropImageEl.value, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        center: true,
        background: false,
        responsive: true,
      });
      cropperReady.value = true;
    };
  });
};

const applyCrop = async () => {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
  if (!canvas) return;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return;
  avatarFile.value = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  avatarPreview.value = URL.createObjectURL(blob);
  isCropOpen.value = false;
  cropper.destroy();
  cropper = null;
  cropperReady.value = false;
  await uploadAvatar();
};

const uploadAvatar = async () => {
  if (!avatarFile.value) return;
  uploading.value = true;
  try {
    const res = await authStore.uploadAvatar(avatarFile.value);
    avatarUrl.value = res.avatarUrl || '';
    avatarPreview.value = '';
    avatarFile.value = null;
    cropPreview.value = '';
  } catch (e) {
    // noop: UI will keep preview
  } finally {
    uploading.value = false;
  }
};

const toggleTheme = () => {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', themeMode.value);
  document.body.classList.toggle('theme-dark', themeMode.value === 'dark');
};

const closeCrop = () => {
  isCropOpen.value = false;
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  cropperReady.value = false;
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

onMounted(async () => {
  await authStore.refreshProfile();
  loadProfile();
  document.body.classList.toggle('theme-dark', themeMode.value === 'dark');
});
</script>

<template>
  <div class="flex min-h-screen bg-[#F3F4F8]">
    <aside class="w-20 bg-[#FEEF6D] flex flex-col items-center py-8 gap-8 border-r border-black/5 hidden md:flex">
      <div class="relative">
        <button
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
      </div>
      <nav class="flex flex-col gap-6 mt-10 text-slate-700">
        <router-link to="/dashboard">
          <LayoutDashboard class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/calendar">
          <CalendarIcon class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/friends">
          <MessageCircle class="w-6 h-6 cursor-pointer hover:text-black transition" />
        </router-link>
        <router-link to="/settings">
          <Settings class="w-6 h-6 cursor-pointer hover:text-black transition text-black" />
        </router-link>
      </nav>
    </aside>

    <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
      <header class="flex items-center justify-between mb-8">
        <div>
          <p class="text-sm uppercase font-bold text-slate-400 tracking-widest">Settings</p>
          <h2 class="text-3xl font-black text-slate-900">Profil & Tema</h2>
        </div>
        <button
          @click="handleLogout"
          class="px-4 py-3 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100"
        >
          <LogOut class="w-4 h-4 inline-block mr-2" /> Logout
        </button>
      </header>

      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">Edit Profil</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 mb-2">Nama</label>
              <input v-model="name" type="text" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 mb-2">Bio</label>
              <textarea v-model="bio" rows="3" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none"></textarea>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 mb-2">Avatar (Cloudinary)</label>
              <div class="flex flex-col gap-3">
                <input
                  @change="onAvatarChange"
                  type="file"
                  accept="image/*"
                  class="w-full border-2 border-dashed border-slate-200 p-4 rounded-2xl bg-slate-50"
                />
                <button
                  @click="uploadAvatar"
                  :disabled="uploading || !avatarFile"
                  class="px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black disabled:opacity-50"
                >
                  {{ uploading ? 'Mengunggah...' : 'Upload Avatar' }}
                </button>
              </div>
            </div>
            <button
              @click="saveProfile"
              :disabled="saving"
              class="px-6 py-3 rounded-2xl bg-black text-white font-bold hover:bg-slate-800"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-5 space-y-6">
          <div class="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 class="font-bold text-slate-800 mb-4">Preview</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-2xl">
                <img v-if="avatarPreview || avatarUrl" :src="avatarPreview || avatarUrl" alt="avatar" class="w-full h-full object-cover" />
                <span v-else>{{ (name || 'M')[0]?.toUpperCase() }}</span>
              </div>
              <div>
                <p class="font-bold text-slate-900">{{ name || 'Nama Kamu' }}</p>
                <p class="text-xs text-slate-400">{{ bio || 'Bio belum diisi.' }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 class="font-bold text-slate-800 mb-2">Tema</h3>
            <p class="text-sm text-slate-500 mb-4">Pilih mode tampilan</p>
            <button
              @click="toggleTheme"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              {{ themeMode === 'dark' ? 'Switch to Light' : 'Switch to Dark' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div
    v-if="isCropOpen"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
    @click.self="closeCrop"
  >
    <div class="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl">
      <h3 class="text-lg font-black text-slate-900 mb-4">Atur Crop Avatar</h3>
      <div class="w-full h-96 bg-slate-100 rounded-2xl overflow-hidden">
        <img ref="cropImageEl" :src="cropPreview" alt="crop" class="w-full h-full object-contain" />
      </div>
      <div class="flex justify-end gap-3 mt-5">
        <button
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
          @click="closeCrop"
        >
          Batal
        </button>
        <button
          class="px-5 py-2 rounded-xl bg-black text-white font-bold disabled:opacity-50"
          :disabled="!cropperReady"
          @click="applyCrop"
        >
          Gunakan
        </button>
      </div>
    </div>
  </div>
</template>
