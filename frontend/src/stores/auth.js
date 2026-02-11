import { defineStore } from 'pinia';
import api from '../lib/api';
import { resetSocket } from '../lib/socket';

const API_URL = '';

export const useAuthStore = defineStore('auth', {
  state: () => {
    const storedUser = localStorage.getItem('user');
    return { 
      user: storedUser ? JSON.parse(storedUser) : null, 
      token: localStorage.getItem('token') 
    };
  },
  actions: {
    async register(data) {
      try {
        const payload = {
          name: (data?.name || '').trim(),
          email: (data?.email || '').trim().toLowerCase(),
          password: data?.password || '',
        };
        const res = await api.post(`${API_URL}/auth/register`, payload);
        this.token = res.data.access_token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        resetSocket();
        return res.data;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Registrasi gagal';
        throw new Error(message);
      }
    },
    async login(email, password) {
      try {
        const res = await api.post(`${API_URL}/auth/login`, {
          email: (email || '').trim().toLowerCase(),
          password: password || '',
        });
        this.token = res.data.access_token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        resetSocket();
        return res.data;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Login gagal';
        throw new Error(message);
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      resetSocket();
    },
    async refreshProfile() {
      try {
        const res = await api.get('/users/me');
        this.user = res.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return res.data;
      } catch (error) {
        return null;
      }
    },
    async updateProfile(payload) {
      const res = await api.patch('/users/me', payload);
      this.user = res.data;
      localStorage.setItem('user', JSON.stringify(this.user));
      return res.data;
    },
    async uploadAvatar(file) {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      this.user = res.data;
      localStorage.setItem('user', JSON.stringify(this.user));
      return res.data;
    },
  }
});
