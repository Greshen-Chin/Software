import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

const theme = localStorage.getItem('theme') || 'light';
document.body.classList.toggle('theme-dark', theme === 'dark');
