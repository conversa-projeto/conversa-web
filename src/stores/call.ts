import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useChatStore } from './chat'
import * as api from '../services/conversaApi'
import type { Chamada, TipoChamada, EventoChamadaSocket } from '../types/api'

export type EstadoChamada = 'inativo' | 'chamando' | 'recebendo' | 'ativa' | 'encerrando'

export interface PeerConexao {
  usuarioId: number
  usuarioNome: string
  txPc: RTCPeerConnection | null
  rxPc: RTCPeerConnection | null
  stream: MediaStream | null
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' }
]

export const useCallStore = defineStore('call', () => {
  const estado = ref<EstadoChamada>('inativo')
  const chamada = ref<Chamada | null>(null)
  const tipoChamada = ref<TipoChamada>(1)
  const micMutado = ref(false)
  const cameraMutada = ref(false)
  const saidaAudioMutada = ref(false)
  const compartilhandoTela = ref(false)
  const erroMsg = ref('')

  const streamLocal = shallowRef<MediaStream | null>(null)
  const streamTela = shallowRef<MediaStream | null>(null)
  const peers = ref<Map<number, PeerConexao>>(new Map())

  let tempoToqueChamada: number | null = null
  let trackCamera: MediaStreamTrack | null = null

  // Timer de duração
  const duracaoChamadaSegundos = ref(0)
  let intervaloDuracao: number | null = null

  const duracaoChamadaFormatada = computed(() => {
    const s = duracaoChamadaSegundos.value
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const seg = s % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(seg)}` : `${pad(m)}:${pad(seg)}`
  })

  function iniciarTimerDuracao() {
    pararTimerDuracao()
    duracaoChamadaSegundos.value = 0
    intervaloDuracao = window.setInterval(() => {
      duracaoChamadaSegundos.value++
    }, 1000)
  }

  function pararTimerDuracao() {
    if (intervaloDuracao !== null) {
      window.clearInterval(intervaloDuracao)
      intervaloDuracao = null
    }
  }

  // --- Computed ---

  const emChamada = computed(() =>
    estado.value === 'chamando' ||
    estado.value === 'ativa' ||
    estado.value === 'encerrando'
  )

  const recebendoChamada = computed(() => estado.value === 'recebendo')

  const participantesAtivos = computed(() => {
    if (!chamada.value) return []
    return chamada.value.usuarios.filter(u => u.status === 3)
  })

  const chamadaRemetente = computed(() => {
    if (!chamada.value) return null
    return chamada.value.usuarios.find(u => u.usuario_id === chamada.value!.criado_por) || null
  })

  const contatosNaoNaChamada = computed(() => {
    const chat = useChatStore()
    if (!chamada.value) return chat.contatos
    const auth = useAuthStore()
    const idsNaChamada = new Set(chamada.value.usuarios.map(u => u.usuario_id))
    if (auth.user) idsNaChamada.add(auth.user.id)
    return chat.contatos.filter(c => !idsNaChamada.has(c.id))
  })

  const somenteRecepcao = computed(() =>
    estado.value === 'ativa' && tipoChamada.value === 2 && !streamLocal.value
  )

  // --- MediaMTX / WebRTC helpers ---

  function getMediaMtxUrl(): string {
    const isSecure = window.location.protocol === 'https:'
    const proto = isSecure ? 'https' : 'http'
    return `${proto}://${window.location.hostname}:8889`
  }

  function sanitizar(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  function esperarICE(pc: RTCPeerConnection): Promise<void> {
    return new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve()
      }
      setTimeout(resolve, 3000)
    })
  }

  function atraso(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  // --- WHIP: publicar stream local para um peer ---

  async function publicarParaPeer(targetUserId: number): Promise<RTCPeerConnection> {
    const auth = useAuthStore()
    if (!auth.user || !streamLocal.value) {
      throw new Error('Stream local ou usuario nao disponivel')
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    streamLocal.value.getTracks().forEach(t => pc.addTrack(t, streamLocal.value!))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await esperarICE(pc)

    const caminhoStream = `${sanitizar(String(auth.user.id))}-to-${sanitizar(String(targetUserId))}`
    const resposta = await fetch(`${getMediaMtxUrl()}/${caminhoStream}/whip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription!.sdp
    })

    if (!resposta.ok) {
      pc.close()
      throw new Error(`WHIP erro: ${resposta.status}`)
    }

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: await resposta.text()
    })

    return pc
  }

  // --- WHEP: assinar stream de um peer ---

  async function assinarDePeer(fromUserId: number): Promise<{ pc: RTCPeerConnection; stream: MediaStream }> {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuario nao disponivel')
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const remoteStream = new MediaStream()

    pc.addTransceiver('audio', { direction: 'recvonly' })
    if (tipoChamada.value === 2) {
      pc.addTransceiver('video', { direction: 'recvonly' })
    }

    pc.ontrack = (e) => {
      remoteStream.addTrack(e.track)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await esperarICE(pc)

    const caminhoStream = `${sanitizar(String(fromUserId))}-to-${sanitizar(String(auth.user.id))}`
    let resposta: Response | null = null
    let tentativas = 0

    while (tentativas++ < 8) {
      try {
        resposta = await fetch(`${getMediaMtxUrl()}/${caminhoStream}/whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription!.sdp
        })
        if (resposta.ok) break
      } catch {
        // retry
      }
      await atraso(800)
    }

    if (!resposta?.ok) {
      pc.close()
      throw new Error(`WHEP erro: ${resposta?.status || 'timeout'}`)
    }

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: await resposta.text()
    })

    return { pc, stream: remoteStream }
  }

  // --- Gerenciamento de peers ---

  async function conectarPeer(usuarioId: number, usuarioNome: string) {
    if (peers.value.has(usuarioId)) return

    const entrada: PeerConexao = {
      usuarioId,
      usuarioNome,
      txPc: null,
      rxPc: null,
      stream: null
    }
    peers.value.set(usuarioId, entrada)
    peers.value = new Map(peers.value)

    try {
      if (streamLocal.value) {
        entrada.txPc = await publicarParaPeer(usuarioId)
      }
      try {
        const { pc, stream } = await assinarDePeer(usuarioId)
        entrada.rxPc = pc
        entrada.stream = stream
      } catch {
        // Peer pode nao estar transmitindo (modo somente-recepcao)
        console.warn(`WHEP: ${usuarioNome} pode nao estar transmitindo ainda`)
      }
      peers.value = new Map(peers.value)
    } catch (e) {
      erroMsg.value = `Erro ao conectar com ${usuarioNome}: ${e instanceof Error ? e.message : String(e)}`
      console.error('Erro conectarPeer', e)
    }
  }

  function desconectarPeer(usuarioId: number) {
    const peer = peers.value.get(usuarioId)
    if (!peer) return

    try { peer.txPc?.close() } catch { /* ignore */ }
    try { peer.rxPc?.close() } catch { /* ignore */ }

    peers.value.delete(usuarioId)
    peers.value = new Map(peers.value)
  }

  function desconectarTodosPeers() {
    for (const [userId] of peers.value) {
      desconectarPeer(userId)
    }
  }

  // --- Media local ---

  async function adquirirMidiaLocal(tipo: TipoChamada): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 48000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: tipo === 2
    })
  }

  function liberarStreamTela() {
    if (streamTela.value) {
      streamTela.value.getTracks().forEach(t => t.stop())
      streamTela.value = null
    }
    compartilhandoTela.value = false
    trackCamera = null
  }

  function liberarMidiaLocal() {
    liberarStreamTela()
    if (streamLocal.value) {
      streamLocal.value.getTracks().forEach(t => t.stop())
      streamLocal.value = null
    }
  }

  function resetarEstado() {
    console.trace('[CALL] resetarEstado chamado, estado anterior:', estado.value)
    pararTimerDuracao()
    duracaoChamadaSegundos.value = 0
    estado.value = 'inativo'
    chamada.value = null
    micMutado.value = false
    cameraMutada.value = false
    saidaAudioMutada.value = false
    compartilhandoTela.value = false
    erroMsg.value = ''
  }

  // --- Acoes de chamada ---

  async function iniciarChamada(tipo: TipoChamada, usuarios: Array<{ id: number }>, comTela = false) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Usuario nao autenticado')
    if (estado.value !== 'inativo') throw new Error('Ja existe uma chamada em andamento')

    erroMsg.value = ''
    tipoChamada.value = tipo

    try {
      if (comTela && tipo === 2) {
        const telaStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 48000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        })
        streamLocal.value = new MediaStream([
          ...audioStream.getAudioTracks(),
          ...telaStream.getVideoTracks()
        ])
        streamTela.value = telaStream
        compartilhandoTela.value = true
        trackCamera = null

        telaStream.getVideoTracks()[0].onended = () => { void pararCompartilhamento() }
      } else {
        streamLocal.value = await adquirirMidiaLocal(tipo)
      }

      estado.value = 'chamando'
      chamada.value = await api.chamadaIniciar(tipo, usuarios)
    } catch (e) {
      liberarMidiaLocal()
      resetarEstado()
      throw e
    }
  }

  async function aceitarChamada() {
    if (!chamada.value || estado.value !== 'recebendo') return

    const auth = useAuthStore()
    if (!auth.user) return

    erroMsg.value = ''
    cancelarTemporizadorToque()

    try {
      if (tipoChamada.value === 1) {
        streamLocal.value = await adquirirMidiaLocal(tipoChamada.value)
      }
      await api.chamadaEntrar(chamada.value.id)
      estado.value = 'ativa'
      iniciarTimerDuracao()

      chamada.value = await api.chamadaDados(chamada.value.id)

      for (const usuario of chamada.value.usuarios) {
        if (usuario.usuario_id !== auth.user.id && usuario.status === 3) {
          await conectarPeer(usuario.usuario_id, usuario.usuario_nome)
        }
      }
    } catch (e) {
      liberarMidiaLocal()
      resetarEstado()
      throw e
    }
  }

  async function recusarChamada() {
    if (!chamada.value || estado.value !== 'recebendo') return

    cancelarTemporizadorToque()

    try {
      await api.chamadaRecusar(chamada.value.id)
    } finally {
      resetarEstado()
    }
  }

  async function sairDaChamada() {
    if (!chamada.value || !emChamada.value) return

    const chamadaId = chamada.value.id
    estado.value = 'encerrando'

    try {
      desconectarTodosPeers()
      liberarMidiaLocal()
      await api.chamadaSair(chamadaId)
    } finally {
      resetarEstado()
    }
  }

  async function cancelarChamada() {
    if (!chamada.value || estado.value !== 'chamando') return

    try {
      liberarMidiaLocal()
      await api.chamadaCancelar(chamada.value.id)
    } finally {
      resetarEstado()
    }
  }

  async function finalizarChamada() {
    if (!chamada.value) return

    const chamadaId = chamada.value.id
    estado.value = 'encerrando'

    try {
      desconectarTodosPeers()
      liberarMidiaLocal()
      await api.chamadaFinalizar(chamadaId)
    } finally {
      resetarEstado()
    }
  }

  // --- Controles de midia ---

  function alternarMicrofone() {
    if (!streamLocal.value) return
    micMutado.value = !micMutado.value
    streamLocal.value.getAudioTracks().forEach(t => {
      t.enabled = !micMutado.value
    })
  }

  function alternarCamera() {
    if (!streamLocal.value || tipoChamada.value !== 2) return
    cameraMutada.value = !cameraMutada.value
    streamLocal.value.getVideoTracks().forEach(t => {
      t.enabled = !cameraMutada.value
    })
  }

  function alternarSaidaAudio() {
    saidaAudioMutada.value = !saidaAudioMutada.value
  }

  // --- Compartilhamento de tela ---

  async function compartilharTela() {
    if (compartilhandoTela.value || tipoChamada.value !== 2 || !streamLocal.value) return

    const telaStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = telaStream.getVideoTracks()[0]

    // Salva track da câmera para restaurar depois
    trackCamera = streamLocal.value.getVideoTracks()[0] || null

    // Troca a track de vídeo em todas as conexões WHIP
    for (const [, peer] of peers.value) {
      const sender = peer.txPc?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
    }

    // Atualiza streamLocal para o tile local mostrar a tela
    if (trackCamera) streamLocal.value.removeTrack(trackCamera)
    streamLocal.value.addTrack(screenTrack)

    streamTela.value = telaStream
    compartilhandoTela.value = true

    screenTrack.onended = () => { void pararCompartilhamento() }
  }

  async function pararCompartilhamento() {
    if (!compartilhandoTela.value || !streamLocal.value) return

    const screenTrack = streamTela.value?.getVideoTracks()[0]

    // Restaura track da câmera ou adquire nova
    if (!trackCamera) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true })
        trackCamera = camStream.getVideoTracks()[0]
      } catch {
        // Câmera indisponível
      }
    }

    // Troca de volta em todas as conexões WHIP
    for (const [, peer] of peers.value) {
      const sender = peer.txPc?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(trackCamera)
    }

    // Atualiza streamLocal
    if (screenTrack) streamLocal.value.removeTrack(screenTrack)
    if (trackCamera) streamLocal.value.addTrack(trackCamera)

    // Para as tracks da tela
    streamTela.value?.getTracks().forEach(t => t.stop())
    streamTela.value = null
    compartilhandoTela.value = false
    trackCamera = null
  }

  // --- Adicionar usuario a chamada ativa ---

  async function adicionarUsuario(usuarioId: number) {
    if (!chamada.value || estado.value !== 'ativa') return
    await api.chamadaAdicionarUsuario(chamada.value.id, usuarioId)
    chamada.value = await api.chamadaDados(chamada.value.id)
  }

  // --- Iniciar transmissao local (receptor que quer comecar a transmitir) ---

  async function iniciarTransmissaoLocal(opcoes?: { video?: boolean }) {
    if (estado.value !== 'ativa') return

    const video = opcoes?.video ?? (tipoChamada.value === 2)
    streamLocal.value = await adquirirMidiaLocal(video ? 2 : 1)

    // Reconecta todos os peers para incluir WHIP
    const peersAtuais = Array.from(peers.value.entries()).map(([id, p]) => ({
      id,
      nome: p.usuarioNome
    }))
    desconectarTodosPeers()
    for (const peer of peersAtuais) {
      await conectarPeer(peer.id, peer.nome)
    }
  }

  // --- Upgrade audio → video ---

  async function upgradeParaVideo() {
    if (tipoChamada.value !== 1 || estado.value !== 'ativa') return

    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
    const videoTrack = videoStream.getVideoTracks()[0]

    if (streamLocal.value) {
      streamLocal.value.addTrack(videoTrack)
    } else {
      // Se nao tinha stream local, adquire audio tambem
      streamLocal.value = await adquirirMidiaLocal(2)
    }

    tipoChamada.value = 2

    // Reconecta peers para enviar video
    const peersAtuais = Array.from(peers.value.entries()).map(([id, p]) => ({
      id,
      nome: p.usuarioNome
    }))
    desconectarTodosPeers()
    for (const peer of peersAtuais) {
      await conectarPeer(peer.id, peer.nome)
    }
  }

  // --- Temporizador de toque ---

  function cancelarTemporizadorToque() {
    if (tempoToqueChamada !== null) {
      window.clearTimeout(tempoToqueChamada)
      tempoToqueChamada = null
    }
  }

  // --- Handler de eventos WebSocket ---

  async function tratarEventoChamada(evento: EventoChamadaSocket) {
    const auth = useAuthStore()
    if (!auth.user) return

    console.log('[CALL] Evento recebido:', evento.tipo, 'chamada_id:', evento.chamada_id, 'usuario_id:', (evento as any).usuario_id, 'estado atual:', estado.value)

    switch (evento.tipo) {
      case 51: {
        // ChamadaRecebida
        if (emChamada.value || estado.value === 'recebendo') {
          try { await api.chamadaRecusar(evento.chamada_id) } catch { /* ignore */ }
          return
        }

        try {
          chamada.value = await api.chamadaDados(evento.chamada_id)
          tipoChamada.value = chamada.value.tipo
          estado.value = 'recebendo'

          cancelarTemporizadorToque()
          tempoToqueChamada = window.setTimeout(() => {
            if (estado.value === 'recebendo') {
              void recusarChamada()
            }
          }, 30000)
        } catch (e) {
          console.error('Erro ao obter dados da chamada recebida', e)
        }
        break
      }

      case 52: {
        // ChamadaFinalizada
        if (chamada.value?.id === evento.chamada_id) {
          cancelarTemporizadorToque()
          desconectarTodosPeers()
          liberarMidiaLocal()
          resetarEstado()
        }
        break
      }

      case 53: {
        // UsuarioRecusou
        if (chamada.value?.id === evento.chamada_id) {
          chamada.value = await api.chamadaDados(evento.chamada_id)

          if (chamada.value.usuarios.length === 2) {
            const outroUsuario = chamada.value.usuarios.find(
              u => u.usuario_id !== auth.user!.id
            )
            if (outroUsuario?.status === 2) {
              desconectarTodosPeers()
              liberarMidiaLocal()
              resetarEstado()
            }
          }
        }
        break
      }

      case 54: {
        // UsuarioEntrou
        if (chamada.value?.id === evento.chamada_id && estado.value === 'chamando') {
          estado.value = 'ativa'
          iniciarTimerDuracao()
        }

        if (chamada.value?.id === evento.chamada_id && estado.value === 'ativa') {
          chamada.value = await api.chamadaDados(evento.chamada_id)
          const novoUsuario = chamada.value.usuarios.find(
            u => u.usuario_id === evento.usuario_id
          )
          if (novoUsuario && novoUsuario.usuario_id !== auth.user!.id) {
            await conectarPeer(novoUsuario.usuario_id, novoUsuario.usuario_nome)
          }
        }
        break
      }

      case 55: {
        // UsuarioSaiu
        if (chamada.value?.id === evento.chamada_id) {
          desconectarPeer(evento.usuario_id)
          chamada.value = await api.chamadaDados(evento.chamada_id)

          const outrosAtivos = chamada.value.usuarios.filter(
            u => u.usuario_id !== auth.user!.id && u.status === 3
          )
          if (outrosAtivos.length === 0 && estado.value === 'ativa') {
            desconectarTodosPeers()
            liberarMidiaLocal()
            try { await api.chamadaSair(chamada.value.id) } catch { /* ignore */ }
            resetarEstado()
          }
        }
        break
      }
    }
  }

  function encerrarChamada() {
    cancelarTemporizadorToque()
    desconectarTodosPeers()
    liberarMidiaLocal()
    resetarEstado()
  }

  return {
    estado,
    chamada,
    tipoChamada,
    micMutado,
    cameraMutada,
    saidaAudioMutada,
    compartilhandoTela,
    streamLocal,
    peers,
    erroMsg,
    emChamada,
    recebendoChamada,
    participantesAtivos,
    chamadaRemetente,
    contatosNaoNaChamada,
    somenteRecepcao,
    duracaoChamadaFormatada,
    iniciarChamada,
    aceitarChamada,
    recusarChamada,
    sairDaChamada,
    cancelarChamada,
    finalizarChamada,
    alternarMicrofone,
    alternarCamera,
    alternarSaidaAudio,
    compartilharTela,
    pararCompartilhamento,
    adicionarUsuario,
    iniciarTransmissaoLocal,
    upgradeParaVideo,
    tratarEventoChamada,
    encerrarChamada
  }
})
