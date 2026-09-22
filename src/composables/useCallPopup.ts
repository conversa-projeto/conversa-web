import { watch, onUnmounted, type Ref } from 'vue'
import { useCallStore } from '../stores/call'

// Sons da chamada, em public/: quem recebe ouve o toque; quem liga ouve o
// som de chamando ate alguem atender. Os dois tocam em loop.
const SOM_RECEBENDO = '/toque.mp3'
const SOM_CHAMANDO = '/chamando.mp3'

export function useCallPopup(erro: Ref<string>) {
  const call = useCallStore()

  // Som da chamada tocando agora
  let somAtual: HTMLAudioElement | null = null
  let liberarAudio: (() => void) | null = null

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

  function tocarTom(arquivo: string) {
    if (somAtual && somAtual.dataset.arquivo === arquivo) return
    pararToque()
    const som = new Audio(arquivo)
    som.dataset.arquivo = arquivo
    som.loop = true
    somAtual = som

    // Sem nenhum clique antes na pagina, o navegador bloqueia o play().
    // Nesse caso o som comeca no primeiro clique ou tecla.
    som.play().catch(() => {
      if (somAtual !== som) return
      liberarAudio = () => {
        if (somAtual === som) void som.play().catch(() => {})
        removerLiberacao()
      }
      document.addEventListener('pointerdown', liberarAudio)
      document.addEventListener('keydown', liberarAudio)
    })
  }

  function removerLiberacao() {
    if (!liberarAudio) return
    document.removeEventListener('pointerdown', liberarAudio)
    document.removeEventListener('keydown', liberarAudio)
    liberarAudio = null
  }

  function pararToque() {
    removerLiberacao()
    if (somAtual) {
      somAtual.pause()
      somAtual.removeAttribute('src')
      somAtual.load()
      somAtual = null
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
  watch(() => call.estado, (estado) => {
    if (estado === 'recebendo') {
      tocarTom(SOM_RECEBENDO)
    } else if (estado === 'chamando') {
      tocarTom(SOM_CHAMANDO)
    } else {
      pararToque()
    }
  })

  watch(() => call.recebendoChamada, (recebendo) => {
    if (recebendo) {
      mostrarNotificacaoChamada()
    } else {
      fecharNotificacaoChamada()
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
