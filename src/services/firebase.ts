import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyAjMFRL2yCK7mgztDCEyMN2UcQaj6YgcXA',
  authDomain: 'conversa-23858.firebaseapp.com',
  projectId: 'conversa-23858',
  storageBucket: 'conversa-23858.firebasestorage.app',
  messagingSenderId: '932487823999',
  appId: '1:932487823999:web:9795983806f06d22c1754a'
}

const VAPID_KEY = 'BIxVmKcGdtCqavyZiKMomPHUgylElGagkS2TnsqM4fI5Zsr8fEN1KgOX0qcNDtdWxatXvvkcG7-_2ryJERKsyJ0'

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export async function obterTokenFCM(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token || null
  } catch {
    return null
  }
}

export function ouvirMensagensForeground(callback: (titulo: string, corpo: string) => void) {
  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {}
    if (title) {
      callback(title, body || '')
    }
  })
}
