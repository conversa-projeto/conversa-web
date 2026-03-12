import { watch, onUnmounted, type Ref } from 'vue'
import { useCallStore } from '../stores/call'

export function useCallPopup(erro: Ref<string>) {
  const call = useCallStore()

  // Ringtone (Web Audio API)
  let toqueAudioCtx: AudioContext | null = null
  let toqueInterval: number | null = null
  let toqueTimeout: number | null = null

  // Browser notification
  let notificacaoChamada: Notification | null = null

  function sairDaChamadaAtual() {
    if (call.estado === 'chamando') {
      void call.cancelarChamada()
    } else {
      void call.sairDaChamada()
    }
  }

  async function upgradeParaVideoUI() {
    try {
      await call.upgradeParaVideo()
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro ao ativar vídeo'
    }
  }

  // Ringtone
  function iniciarToque() {
    if (toqueAudioCtx) return
    toqueAudioCtx = new AudioContext()

    function tocar() {
      if (!toqueAudioCtx) return
      const osc = toqueAudioCtx.createOscillator()
      const gain = toqueAudioCtx.createGain()
      osc.connect(gain)
      gain.connect(toqueAudioCtx.destination)
      osc.frequency.value = 440
      gain.gain.value = 0.3
      osc.start()
      toqueTimeout = window.setTimeout(() => {
        toqueTimeout = null
        try { osc.stop(); osc.disconnect(); gain.disconnect() } catch { /* ignore */ }
      }, 1000)
    }

    tocar()
    toqueInterval = window.setInterval(tocar, 3000)
  }

  function pararToque() {
    if (toqueTimeout) { clearTimeout(toqueTimeout); toqueTimeout = null }
    if (toqueInterval) { clearInterval(toqueInterval); toqueInterval = null }
    if (toqueAudioCtx) {
      void toqueAudioCtx.close().catch(() => {})
      toqueAudioCtx = null
    }
  }

  // Notification
  function mostrarNotificacaoChamada() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const remetente = call.chamadaRemetente?.usuario_nome || 'Alguém'
    const tipo = call.tipoChamada === 2 ? 'Vídeo' : 'Áudio'
    notificacaoChamada = new Notification('Chamada recebida', {
      body: `${remetente} está ligando (${tipo})`,
      tag: 'conversa-chamada',
      requireInteraction: true
    })
    notificacaoChamada.onclick = () => {
      window.focus()
      notificacaoChamada?.close()
      notificacaoChamada = null
    }
  }

  function fecharNotificacaoChamada() {
    if (notificacaoChamada) {
      notificacaoChamada.close()
      notificacaoChamada = null
    }
  }

  // Watchers
  watch(() => call.recebendoChamada, (recebendo) => {
    if (recebendo) {
      iniciarToque()
      mostrarNotificacaoChamada()
    } else {
      pararToque()
      fecharNotificacaoChamada()
    }
  })

  watch(() => call.emChamada, (em) => {
    if (!em) {
      pararToque()
    }
  })

  function cleanup() {
    pararToque()
    fecharNotificacaoChamada()
  }

  onUnmounted(cleanup)

  return {
    sairDaChamadaAtual,
    upgradeParaVideoUI,
    pararToque,
    cleanup
  }
}
