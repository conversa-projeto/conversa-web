/**
 * Utilitário para sons e notificações.
 */

let notificationAudio: HTMLAudioElement | null = null

/**
 * Toca o som de notificação.
 * O arquivo deve estar em public/notification.mp3
 */
export function playNotificationSound() {
    try {
        if (!notificationAudio) {
            notificationAudio = new Audio('/notification.mp3')
        }

        // Reinicia o áudio se ele já estiver tocando
        notificationAudio.currentTime = 0
        void notificationAudio.play().catch(err => {
            console.warn('Erro ao tocar som de notificação:', err)
            // Fallback: Beep simples usando Web Audio API se o arquivo falhar
            playFallbackBeep()
        })
    } catch (err) {
        console.error('Erro ao inicializar áudio:', err)
    }
}

/**
 * Toca um beep simples como fallback caso o arquivo de áudio não carregue
 */
function playFallbackBeep() {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // Lá (A5)

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5)

        oscillator.start(audioCtx.currentTime)
        oscillator.stop(audioCtx.currentTime + 0.5)
    } catch (err) {
        console.warn('Web Audio API não suportada ou erro:', err)
    }
}

/**
 * Solicita permissão para notificações no navegador
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return 'denied'
    }

    if (Notification.permission === 'default') {
        return await Notification.requestPermission()
    }

    return Notification.permission
}

/**
 * Exibe uma notificação no navegador
 */
export function showNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return
    }

    try {
        const notification = new Notification(title, {
            icon: '/logo.png', // Usa o logo do projeto como ícone
            ...options
        })

        notification.onclick = () => {
            window.focus()
            notification.close()
        }
    } catch (err) {
        console.error('Erro ao exibir notificação:', err)
    }
}
