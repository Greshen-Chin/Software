<template>
  <div class="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-6 font-sans">
    <div class="bg-white w-full max-w-[1000px] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
      
      <div class="md:w-1/2 bg-[#FEEF6D] p-12 lg:p-16 flex flex-col justify-between relative">
        <div class="z-10">
          <div class="text-2xl font-black italic tracking-tighter text-slate-900 mb-20">MahaTask.</div>
          <h1 class="text-5xl font-black leading-[1.1] text-slate-900">Your Academic Life, Simplified.</h1>
          <p class="mt-6 text-slate-700 font-medium text-lg">Kelola tugas, jadwal, dan kolaborasi grup belajar dalam satu dashboard bento yang cantik.</p>
        </div>
        
        <div class="z-10 bg-black/5 p-6 rounded-[2rem] backdrop-blur-sm border border-black/5">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold italic">M</div>
            <div>
              <p class="text-xs font-black uppercase tracking-widest text-slate-500">Trusted By</p>
              <p class="text-sm font-bold text-slate-900">500+ Mahasiswa Produktif</p>
            </div>
          </div>
        </div>
      </div>

      <div class="md:w-1/2 p-12 lg:p-20 flex flex-col justify-center bg-white">
        <div class="mb-10">
          <h2 class="text-4xl font-black text-slate-900 mb-3">{{ isRegister ? 'Buat Akun Baru' : 'Selamat Datang.' }}</h2>
          <p class="text-slate-400 font-medium italic">{{ isRegister ? 'Bergabung dengan komunitas mahasiswa produktif' : 'Masukkan kredensial kampusmu untuk masuk.' }}</p>
        </div>

        <form @submit.prevent="isRegister ? handleRegister() : handleLogin()" class="space-y-6">
          <div v-if="isRegister" class="group">
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Nama Lengkap</label>
            <input v-model="name" type="text" placeholder="Nama Mahasiswa" 
              class="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#FEEF6D] focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" required />
          </div>

          <div class="group">
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Email Mahasiswa</label>
            <input v-model="email" type="email" placeholder="nama@student.id" 
              class="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#FEEF6D] focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" required />
          </div>

          <div class="group">
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Password</label>
            <input v-model="password" type="password" :placeholder="isRegister ? 'Minimal 6 karakter' : '********'" 
              class="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#FEEF6D] focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" 
              :minlength="isRegister ? 6 : undefined" required />
          </div>

          <div v-if="isRegister" class="group">
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Konfirmasi Password</label>
            <input v-model="confirmPassword" type="password" placeholder="Ulangi password" 
              class="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#FEEF6D] focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" required />
          </div>

          <button type="submit" 
            class="w-full bg-black text-white p-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transform hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 mt-4">
            {{ isRegister ? 'Daftar Sekarang' : 'Masuk Sekarang' }}
          </button>
        </form>

        <div class="mt-12 text-center">
          <p class="text-sm font-bold text-slate-400">
            {{ isRegister ? 'Sudah punya akun?' : 'Belum punya akun?' }}
            <span @click="isRegister = !isRegister" class="text-indigo-600 cursor-pointer hover:underline">
              {{ isRegister ? 'Masuk di sini' : 'Daftar Akun Baru' }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const isRegister = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch (error) {
    const message = error?.message || 'Email atau password salah.';
    alert('Login Gagal: ' + message);
  }
};

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    alert('Password tidak cocok!');
    return;
  }
  if (password.value.length < 6) {
    alert('Password minimal 6 karakter!');
    return;
  }
  try {
    await authStore.register({
      name: name.value,
      email: email.value,
      password: password.value,
    });
    alert('Registrasi berhasil. Silakan login.');
    router.push('/login');
  } catch (error) {
    const message = error?.message || 'Terjadi kesalahan.';
    alert('Registrasi Gagal: ' + message);
  }
};
</script>

