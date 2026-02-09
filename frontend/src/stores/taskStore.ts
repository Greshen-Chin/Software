import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = 'http://localhost:3000/tasks';

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [] as any[],
  }),
  getters: {
    stats: (state) => ({
      done: state.tasks.filter(t => t.status === 'DONE').length,
      pending: state.tasks.filter(t => t.status === 'TODO').length,
      expired: state.tasks.filter(t => t.status === 'EXPIRED').length,
    })
  },
  actions: {
    async fetchTasks() {
      try {
        const res = await axios.get(API_URL);
        this.tasks = res.data;
      } catch (e) { console.error("Gagal load data"); }
    },
    async addTask(task: any) {
      await axios.post(API_URL, task);
      await this.fetchTasks();
    },
    async completeTask(id:string) {
  try {
    await axios.patch(`http://localhost:3000/tasks/${id}/status`, { status: 'DONE' });
    await this.fetchTasks(); // Refresh data otomatis setelah update
  } catch (err) {
    alert(err.response?.data?.message || "Gagal mengupdate task");
  }
}
  }
});