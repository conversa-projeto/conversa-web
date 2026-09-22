importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAjMFRL2yCK7mgztDCEyMN2UcQaj6YgcXA',
  authDomain: 'conversa-23858.firebaseapp.com',
  projectId: 'conversa-23858',
  storageBucket: 'conversa-23858.firebasestorage.app',
  messagingSenderId: '932487823999',
  appId: '1:932487823999:web:9795983806f06d22c1754a'
})

const messaging = firebase.messaging()

// A API manda so dados (titulo, mensagem, conversa), entao a notificacao e
// mostrada aqui e o clique fica com o handler abaixo.
messaging.onBackgroundMessage((payload) => {
  const { titulo, mensagem, conversa } = payload.data || {}
  if (!titulo) return

  return self.registration.showNotification(titulo, {
    body: mensagem || '',
    icon: '/logo.png',
    silent: true,
    tag: conversa ? `conversa-${conversa}` : undefined,
    data: { conversa: Number(conversa) || null }
  })
})

// Foca a janela principal ja aberta e pede para ela abrir a conversa. So abre
// uma guia nova quando nao ha nenhuma.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const conversa = event.notification.data?.conversa || null

  event.waitUntil((async () => {
    const janelas = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const principais = janelas.filter((j) => !new URL(j.url).pathname.startsWith('/chat-popup'))
    const janela = principais.find((j) => j.focused) || principais.find((j) => j.visibilityState === 'visible') || principais[0]

    if (janela) {
      await janela.focus()
      if (conversa) janela.postMessage({ tipo: 'conversa-abrir', conversaId: conversa })
      return
    }
    await clients.openWindow(conversa ? `/chat/${conversa}` : '/')
  })())
})
