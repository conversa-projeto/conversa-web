let notificationAudio: HTMLAudioElement | null = null
let fallbackAudioCtx: AudioContext | null = null

export function playNotificationSound() {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification.mp3')
    }

    notificationAudio.currentTime = 0
    void notificationAudio.play().catch(() => {
      playFallbackBeep()
    })
  } catch {
    // ignore
  }
}

function playFallbackBeep() {
  try {
    if (!fallbackAudioCtx) {
      fallbackAudioCtx = new AudioContext()
    }

    const ctx = fallbackAudioCtx
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {
    // Web Audio API indisponivel
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission()
  }

  return Notification.permission
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  try {
    const notification = new Notification(title, {
      icon: '/logo.png',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    // ignore
  }
}
