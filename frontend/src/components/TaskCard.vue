<script setup>
defineProps(['task']);
const emit = defineEmits(['complete']);
</script>

<template>
  <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center transition hover:shadow-md">
    <div class="flex gap-4 items-center">
      <div :class="task.status === 'DONE' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'" class="p-3 rounded-xl font-bold">
        {{ task.status === 'DONE' ? '✓' : '!' }}
      </div>
      <div>
        <h3 class="font-bold text-lg" :class="{ 'line-through text-gray-400': task.status === 'DONE' }">{{ task.title }}</h3>
        <p class="text-sm text-gray-500">Deadline: {{ new Date(task.deadline).toLocaleString() }}</p>
      </div>
    </div>
    <button v-if="task.status === 'TODO'" @click="emit('complete', task.id)" class="bg-slate-100 hover:bg-green-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition">
      Selesai
    </button>
  </div>
</template>