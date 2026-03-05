import { ref, watch, type Ref, createApp, type App as VueApp } from 'vue'
import { useCallStore } from '../stores/call'
import { pinia } from '../pinia'
import CallWindow from '../CallWindow.vue'

export function useCallPopup(erro: Ref<string>) {
  const call = useCallStore()

  const janelaChamada = ref<Window | null>(null)
  let appPopup: VueApp | null = null

  // Ringtone (Web Audio API)
  let toqueAudioCtx: AudioContext | null = null
  let toqueInterval: number | null = null

  // Browser notification
  let notificacaoChamada: Notification | null = null

  function abrirJanelaChamada() {
    if (janelaChamada.value && !janelaChamada.value.closed) {
      janelaChamada.value.focus()
      return
    }

    const popup = window.open('', 'conversa-chamada', 'width=800,height=600,resizable=yes')
    if (!popup) return

    janelaChamada.value = popup

    popup.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chamada</title>')
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      popup.document.write(link.outerHTML)
    }
    for (const style of document.querySelectorAll('style')) {
      popup.document.write(style.outerHTML)
    }
    popup.document.write('</head><body><div id="call-app"></div></body></html>')
    popup.document.close()

    popup.addEventListener('DOMContentLoaded', () => mountPopupApp(popup))
    if (popup.document.readyState !== 'loading') {
      mountPopupApp(popup)
    }

    popup.addEventListener('beforeunload', () => {
      fecharJanelaChamada(false)
    })
  }

  function mountPopupApp(popup: Window) {
    const container = popup.document.getElementById('call-app')
    if (!container || appPopup) return

    appPopup = createApp(CallWindow)
    appPopup.use(pinia)
    appPopup.mount(container)
  }

  function fecharJanelaChamada(fecharPopup = true) {
    if (appPopup) {
      appPopup.unmount()
      appPopup = null
    }
    if (fecharPopup && janelaChamada.value && !janelaChamada.value.closed) {
      janelaChamada.value.close()
    }
    janelaChamada.value = null
  }

  function sairDaChamadaAtual() {
    fecharJanelaChamada()
    if (call.estado === 'chamando') {
      void call.cancelarChamada()
    } else {
      void call.sairDaChamada()
    }
  }

  async function upgradeParaVideoUI() {
    try {
      await call.upgradeParaVideo()
      abrirJanelaChamada()
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro ao ativar v\u00EDdeo'
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
      setTimeout(() => { osc.stop(); osc.disconnect(); gain.disconnect() }, 1000)
    }

    tocar()
    toqueInterval = window.setInterval(tocar, 3000)
  }

  function pararToque() {
    if (toqueInterval) { clearInterval(toqueInterval); toqueInterval = null }
    if (toqueAudioCtx) { toqueAudioCtx.close(); toqueAudioCtx = null }
  }

  // Notification
  function mostrarNotificacaoChamada() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const remetente = call.chamadaRemetente?.usuario_nome || 'Algu\u00E9m'
    const tipo = call.tipoChamada === 2 ? 'V\u00EDdeo' : '\u00C1udio'
    notificacaoChamada = new Notification('Chamada recebida', {
      body: `${remetente} est\u00E1 ligando (${tipo})`,
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
      fecharJanelaChamada()
      pararToque()
    }
  })

  function cleanup() {
    fecharJanelaChamada()
    pararToque()
    fecharNotificacaoChamada()
  }

  return {
    janelaChamada,
    abrirJanelaChamada,
    fecharJanelaChamada,
    sairDaChamadaAtual,
    upgradeParaVideoUI,
    pararToque,
    fecharNotificacaoChamada,
    cleanup
  }
}
