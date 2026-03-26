import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ChatPopup from './components/ChatPopup.vue'
import './style.css'

const params = new URLSearchParams(window.location.search)
const conversaId = Number(params.get('conversa'))

if (!conversaId || conversaId <= 0) {
  document.body.innerHTML = '<p style="padding:2rem;color:#666">Conversa invalida.</p>'
} else {
  const app = createApp(ChatPopup, { conversaId })
  app.use(createPinia())
  app.mount('#chat-popup')
}
