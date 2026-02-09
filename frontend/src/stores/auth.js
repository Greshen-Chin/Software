import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Setup axios defaults
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

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
        const res = await axios.post(`${API_URL}/auth/register`, data);
        this.token = res.data.access_token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        return res.data;
      } catch (error) {
        throw error.response?.data?.message || error.message || 'Registrasi gagal';
      }
    },
    async login(email, password) {
      try {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        this.token = res.data.access_token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        return res.data;
      } catch (error) {
        throw error.response?.data?.message || error.message || 'Login gagal';
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  }
});