import { defineStore } from 'pinia';
import api from '../lib/api';

const API_URL = '/tasks';

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [] as any[],
  }),
  getters: {
    stats: (state) => ({
      done: state.tasks.filter(t => t.status === 'DONE').length,
      pending: state.tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length,
      expired: state.tasks.filter(t => t.status === 'EXPIRED').length,
    })
  },
  actions: {
    async fetchTasks() {
      try {
        const res = await api.get(API_URL);
        this.tasks = res.data || [];
      } catch (e: any) {
        console.error("Gagal load data", e);
        if (e.response?.status === 401) {
          window.location.href = '/login';
        }
        this.tasks = [];
      }
    },
    async addTask(task: any) {
      try {
        await api.post(API_URL, task);
        await this.fetchTasks();
      } catch (e: any) {
        const errorMsg = e.response?.data?.message || 'Gagal menambah task';
        throw new Error(errorMsg);
      }
    },
    async completeTask(id: string) {
      try {
        await api.patch(`${API_URL}/${id}/status`, { status: 'DONE' });
        await this.fetchTasks();
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || "Gagal mengupdate task";
        throw new Error(errorMsg);
      }
    }
  }
});
