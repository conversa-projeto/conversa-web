import { createApp } from 'vue'
import { pinia } from './pinia'
import App from './App.vue'
import './style.css'
import './composables/useCoresPersonalizadas'

createApp(App).use(pinia).mount('#app')
