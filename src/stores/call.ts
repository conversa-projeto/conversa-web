import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
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
  const erroMsg = ref('')

  const streamLocal = shallowRef<MediaStream | null>(null)
  const peers = ref<Map<number, PeerConexao>>(new Map())

  let tempoToqueChamada: number | null = null

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

    while (tentativas++ < 15) {
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
      entrada.txPc = await publicarParaPeer(usuarioId)
      const { pc, stream } = await assinarDePeer(usuarioId)
      entrada.rxPc = pc
      entrada.stream = stream
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

  function liberarMidiaLocal() {
    if (streamLocal.value) {
      streamLocal.value.getTracks().forEach(t => t.stop())
      streamLocal.value = null
    }
  }

  function resetarEstado() {
    estado.value = 'inativo'
    chamada.value = null
    micMutado.value = false
    cameraMutada.value = false
    saidaAudioMutada.value = false
    erroMsg.value = ''
  }

  // --- Acoes de chamada ---

  async function iniciarChamada(tipo: TipoChamada, usuarios: Array<{ id: number }>) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Usuario nao autenticado')
    if (estado.value !== 'inativo') throw new Error('Ja existe uma chamada em andamento')

    erroMsg.value = ''
    tipoChamada.value = tipo

    try {
      streamLocal.value = await adquirirMidiaLocal(tipo)
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
      streamLocal.value = await adquirirMidiaLocal(tipoChamada.value)
      await api.chamadaEntrar(chamada.value.id)
      estado.value = 'ativa'

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
    streamLocal,
    peers,
    erroMsg,
    emChamada,
    recebendoChamada,
    participantesAtivos,
    chamadaRemetente,
    iniciarChamada,
    aceitarChamada,
    recusarChamada,
    sairDaChamada,
    cancelarChamada,
    finalizarChamada,
    alternarMicrofone,
    alternarCamera,
    alternarSaidaAudio,
    tratarEventoChamada,
    encerrarChamada
  }
})
