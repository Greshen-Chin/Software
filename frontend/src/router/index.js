import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Calendar from '../views/Calendar.vue';
import Auth from '../views/Auth.vue';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  { 
    path: '/calendar', 
    name: 'Calendar',
    component: Calendar,
    meta: { requiresAuth: true }
  },
  { 
    path: '/login', 
    name: 'Auth',
    component: Auth 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// LOGIKA PENJAGA: Cek apakah ada token sebelum masuk Dashboard
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token');
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login'); // Lempar ke login jika tidak ada kunci
  } else {
    next(); // Izinkan lewat
  }
});

export default router;
