import { defineStore } from 'pinia';
import api from '../lib/api';

const API_URL = '/schedules';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [] as any[],
    filter: 'ALL' as 'ALL' | 'EVENT' | 'MEETING' | 'TASK_REMINDER',
  }),
  getters: {
    filteredSchedules: (state) => {
      if (state.filter === 'ALL') return state.schedules;
      return state.schedules.filter(s => s.type === state.filter);
    },
  },
  actions: {
    async fetchSchedules() {
      try {
        const res = await api.get(API_URL);
        this.schedules = res.data || [];
      } catch (e: any) {
        console.error('Gagal load schedules', e);
        if (e.response?.status === 401) {
          // Token expired, redirect to login
          window.location.href = '/login';
        }
        this.schedules = [];
      }
    },
    async addSchedule(schedule: any) {
      try {
        await api.post(API_URL, schedule);
        await this.fetchSchedules();
      } catch (e: any) {
        const errorMsg = e.response?.data?.message || 'Gagal menambah jadwal';
        throw new Error(errorMsg);
      }
    },
    async deleteSchedule(id: string) {
      try {
        await api.delete(`${API_URL}/${id}`);
        await this.fetchSchedules();
      } catch (e: any) {
        const errorMsg = e.response?.data?.message || 'Gagal menghapus schedule';
        throw new Error(errorMsg);
      }
    },
    setFilter(filter: 'ALL' | 'EVENT' | 'MEETING' | 'TASK_REMINDER') {
      this.filter = filter;
    },
  },
});
