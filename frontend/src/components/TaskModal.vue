<script setup>
import { ref } from 'vue';
import { useTaskStore } from '../stores/taskStore';

const props = defineProps(['isOpen']);
const emit = defineEmits(['close']);
const store = useTaskStore();

const taskData = ref({ title: '', startDate: '', deadline: '', priority: 2, progress: 0 });

const submit = async () => {
  await store.addTask(taskData.value);
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h2 class="text-2xl font-black text-slate-800 mb-6">Tugas Baru 📝</h2>
      <div class="space-y-5">
        <input v-model="taskData.title" type="text" placeholder="Apa yang mau dikerjakan?" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none" />
        <div class="grid grid-cols-2 gap-4">
          <input v-model="taskData.startDate" type="datetime-local" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none" />
          <input v-model="taskData.deadline" type="datetime-local" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none" />
        </div>
        <select v-model="taskData.priority" class="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none">
          <option :value="1">Rendah</option>
          <option :value="2">Sedang</option>
          <option :value="3">Tinggi (Mendesak!)</option>
        </select>
        <div>
          <label class="text-xs font-bold text-slate-400 uppercase">Progress</label>
          <input v-model.number="taskData.progress" type="range" min="0" max="100" class="w-full" />
        </div>
      </div>
      <div class="flex gap-4 mt-8">
        <button @click="emit('close')" class="flex-1 py-4 font-bold text-slate-400">Batal</button>
        <button @click="submit" class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">Simpan</button>
      </div>
    </div>
  </div>
</template>
