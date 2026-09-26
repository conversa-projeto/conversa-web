import { watch, onUnmounted, type Ref } from 'vue'
import { useCallStore } from '../stores/call'
import { obterRegistroNotificacoes } from '../utils/sound'

// Sons da chamada, em public/: quem recebe ouve o toque; quem liga ouve o
// som de chamando ate alguem atender. Os dois tocam em loop.
const SOM_RECEBENDO = '/toque.mp3'
const SOM_CHAMANDO = '/chamando.mp3'
const TAG_CHAMADA = 'conversa-chamada'

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

  // Notification. Criada pelo service worker, o clique foca a aba já aberta
  // (criada pela página, abriria outra aba se ela tivesse sido recarregada).
  function mostrarNotificacaoChamada() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const remetente = call.chamadaRemetente?.usuario_nome || 'Alguém'
    const tipo = call.tipoChamada === 2 ? 'Vídeo' : 'Áudio'
    const titulo = 'Chamada recebida'
    const opcoes: NotificationOptions = {
      body: `${remetente} está ligando (${tipo})`,
      tag: TAG_CHAMADA,
      requireInteraction: true
    }
    void obterRegistroNotificacoes().then((registro): Promise<void> | undefined => {
      if (registro) return registro.showNotification(titulo, { ...opcoes, icon: '/logo.png', data: { conversa: null } })
      notificacaoChamada = new Notification(titulo, opcoes)
      notificacaoChamada.onclick = () => {
        window.focus()
        notificacaoChamada?.close()
        notificacaoChamada = null
      }
      return undefined
    }).catch(() => {})
  }

  function fecharNotificacaoChamada() {
    if (notificacaoChamada) {
      notificacaoChamada.close()
      notificacaoChamada = null
    }
    void obterRegistroNotificacoes()
      .then((registro) => registro?.getNotifications({ tag: TAG_CHAMADA }))
      .then((notificacoes) => notificacoes?.forEach((n) => n.close()))
      .catch(() => {})
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
