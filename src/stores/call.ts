import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useChatStore } from './chat'
import * as api from '../services/conversaApi'
import { TipoChamada, StatusUsuarioChamada, TipoEventoSocket } from '../types/api'
import type { Chamada, EventoChamadaSocket } from '../types/api'

export type EstadoChamada = 'inativo' | 'chamando' | 'recebendo' | 'ativa' | 'encerrando'

export interface PeerConexao {
  usuarioId: number
  usuarioNome: string
  txPc: RTCPeerConnection | null
  rxPc: RTCPeerConnection | null
  stream: MediaStream | null
}

const ICE_SERVERS: RTCIceServer[] = (() => {
  const stunUrl = import.meta.env.VITE_STUN_URL
  if (!stunUrl) return []
  return [{ urls: stunUrl }]
})()

export const useCallStore = defineStore('call', () => {
  const estado = ref<EstadoChamada>('inativo')
  const chamada = ref<Chamada | null>(null)
  const tipoChamada = ref<TipoChamada>(1)
  const micMutado = ref(false)
  const cameraMutada = ref(false)
  const saidaAudioMutada = ref(false)
  const compartilhandoTela = ref(false)
  const erroMsg = ref('')
  const videoAtivadoPor = ref<{ usuarioId: number; usuarioNome: string } | null>(null)
  let videoAtivadoTimeout: number | null = null

  const streamLocal = shallowRef<MediaStream | null>(null)
  const streamTela = shallowRef<MediaStream | null>(null)
  const peers = shallowRef<Map<number, PeerConexao>>(new Map())

  let tempoToqueChamada: number | null = null
  let trackCamera: MediaStreamTrack | null = null
  let pcPublicacaoLocal: RTCPeerConnection | null = null
  let repondoPublicacaoLocal = false
  let intervaloMonitoramentoPeers: number | null = null
  let sincronizando = false

  // Notifica todos os assinantes de peers criando um novo Map.
  // Necessário porque triggerRef não propaga para apps Vue em popup windows.
  function notificarPeers() {
    peers.value = new Map(peers.value)
  }

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
    iniciarMonitoramentoPeers()
  }

  function pararTimerDuracao() {
    if (intervaloDuracao !== null) {
      window.clearInterval(intervaloDuracao)
      intervaloDuracao = null
    }
    pararMonitoramentoPeers()
  }

  function iniciarMonitoramentoPeers() {
    if (intervaloMonitoramentoPeers !== null) return

    intervaloMonitoramentoPeers = window.setInterval(() => {
      if (estado.value === 'ativa') {
        void sincronizarPeersAtivos()
      }
    }, 4000)
  }

  function pararMonitoramentoPeers() {
    if (intervaloMonitoramentoPeers === null) return

    window.clearInterval(intervaloMonitoramentoPeers)
    intervaloMonitoramentoPeers = null
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
    return chamada.value.usuarios.filter(u => u.status === StatusUsuarioChamada.Entrou)
  })

  const chamadaRemetente = computed(() => {
    if (!chamada.value) return null
    return chamada.value.usuarios.find(u => normalizeUserId(u.usuario_id) === Number(chamada.value!.criado_por)) || null
  })

  const contatosNaoNaChamada = computed(() => {
    const chat = useChatStore()
    if (!chamada.value) return chat.contatos
    const auth = useAuthStore()
    const idsNaChamada = new Set(chamada.value.usuarios.map(u => normalizeUserId(u.usuario_id)).filter((id): id is number => id !== null))
    if (auth.user) idsNaChamada.add(Number(auth.user.id))
    return chat.contatos.filter((c: { id: number }) => !idsNaChamada.has(c.id))
  })

  const somenteRecepcao = computed(() =>
    estado.value === 'ativa' && tipoChamada.value === TipoChamada.Video && !streamLocal.value
  )

  // --- MediaMTX / WebRTC helpers ---

  function getMediaMtxUrl(): string {
    const isSecure = window.location.protocol === 'https:'
    const proto = isSecure ? 'https' : 'http'
    const port = import.meta.env.VITE_MEDIAMTX_PORT
    return `${proto}://${window.location.hostname}:${port}`
  }

  function sanitizar(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  function getChamadaIdAtual(): number {
    const chamadaId = chamada.value?.id
    if (!chamadaId) {
      throw new Error('ID da chamada indisponivel')
    }
    return chamadaId
  }

  function montarCaminhoSala(chamadaId: number): string {
    return `call-${sanitizar(String(chamadaId))}`
  }

  function montarCaminhoStreamUsuario(chamadaId: number, usuarioId: number): string {
    return `${montarCaminhoSala(chamadaId)}-u-${sanitizar(String(usuarioId))}`
  }

  function esperarICE(pc: RTCPeerConnection): Promise<void> {
    return new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        pc.onicegatheringstatechange = null
        resolve()
      }, 3000)
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer)
          pc.onicegatheringstatechange = null
          resolve()
        }
      }
    })
  }

  function atraso(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function getAuthUserId(): number | null {
    const auth = useAuthStore()
    if (!auth.user) return null
    const id = Number(auth.user.id)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  function normalizeUserId(value: unknown): number | null {
    const id = Number(value)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  function isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
  }

  function criarConstraintsMidia(tipo: TipoChamada): MediaStreamConstraints {
    const audio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }

    if (tipo !== TipoChamada.Video) {
      return { audio, video: false }
    }

    const video: MediaTrackConstraints = isMobileDevice()
      ? {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 360, max: 720 },
        frameRate: { ideal: 15, max: 24 },
        facingMode: 'user'
      }
      : {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 24, max: 30 }
      }

    return { audio, video }
  }

  // --- WHIP: publicar stream local para um peer ---

  async function publicarLocalNaSala(): Promise<RTCPeerConnection> {
    const auth = useAuthStore()
    if (!auth.user || !streamLocal.value) {
      throw new Error('Stream local ou usuario nao disponivel')
    }
    const chamadaId = getChamadaIdAtual()

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    streamLocal.value.getTracks().forEach(t => pc.addTrack(t, streamLocal.value!))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await esperarICE(pc)

    const caminhoStream = montarCaminhoStreamUsuario(chamadaId, auth.user.id)
    const tracksLocais = streamLocal.value.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, muted: t.muted }))
    console.debug('[CALL][WHIP] publicarLocalNaSala', { chamadaId, usuarioId: auth.user.id, caminhoStream, tracksLocais })
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

    console.debug('[CALL][WHIP] publicado com sucesso', { caminhoStream })
    monitorarPublicacaoLocal(pc)

    return pc
  }

  async function reestabelecerPublicacaoLocal() {
    if (repondoPublicacaoLocal) return
    if (!streamLocal.value || !chamada.value) return
    if (estado.value !== 'ativa' && estado.value !== 'chamando') return

    repondoPublicacaoLocal = true
    try {
      encerrarPublicacaoLocal()
      pcPublicacaoLocal = await publicarLocalNaSala()

      for (const [, peer] of peers.value) {
        peer.txPc = pcPublicacaoLocal
      }
      notificarPeers()

      if (estado.value === 'ativa') {
        await sincronizarPeersComRetentativas(2)
      }
    } catch (e) {
      console.warn('Falha ao restabelecer publicacao local', e)
    } finally {
      repondoPublicacaoLocal = false
    }
  }

  function monitorarPublicacaoLocal(pc: RTCPeerConnection) {
    pc.onconnectionstatechange = () => {
      const estadoPc = pc.connectionState
      console.debug('[CALL][WHIP] connectionState', { state: estadoPc })
      if (
        (estadoPc === 'failed' || estadoPc === 'disconnected') &&
        pcPublicacaoLocal === pc
      ) {
        console.warn('[CALL][WHIP] conexão perdida, reestabelecendo publicação...')
        void reestabelecerPublicacaoLocal()
      }
    }
    pc.oniceconnectionstatechange = () => {
      console.debug('[CALL][WHIP] iceConnectionState', { state: pc.iceConnectionState })
    }
  }

  // --- WHEP: assinar stream de um peer ---

  async function assinarDePeer(fromUserId: number): Promise<{ pc: RTCPeerConnection; stream: MediaStream }> {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuario nao disponivel')
    }
    const chamadaId = getChamadaIdAtual()

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const remoteStream = new MediaStream()

    pc.addTransceiver('audio', { direction: 'recvonly' })
    if (tipoChamada.value === TipoChamada.Video) {
      pc.addTransceiver('video', { direction: 'recvonly' })
    }

    pc.ontrack = (e) => {
      remoteStream.addTrack(e.track)
      console.log('[CALL][WHEP] track recebida', {
        fromUserId,
        kind: e.track.kind,
        muted: e.track.muted,
        enabled: e.track.enabled,
        readyState: e.track.readyState,
        totalTracks: remoteStream.getTracks().length,
        videoTracks: remoteStream.getVideoTracks().length
      })

      e.track.onended = () => {
        console.warn('[CALL][WHEP] track ended', { fromUserId, kind: e.track.kind })
      }
      e.track.onmute = () => {
        console.warn('[CALL][WHEP] track muted', { fromUserId, kind: e.track.kind })
      }
      e.track.onunmute = () => {
        console.debug('[CALL][WHEP] track unmuted', { fromUserId, kind: e.track.kind })
        notificarPeers()
      }

      // Forca reatividade para atualizar tile remoto quando o video chega depois.
      notificarPeers()
    }

    pc.onconnectionstatechange = () => {
      console.debug('[CALL][WHEP] connectionState', { fromUserId, state: pc.connectionState })
    }

    pc.oniceconnectionstatechange = () => {
      console.debug('[CALL][WHEP] iceConnectionState', { fromUserId, state: pc.iceConnectionState })
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await esperarICE(pc)

    const caminhoStream = montarCaminhoStreamUsuario(chamadaId, fromUserId)
    let resposta: Response | null = null
    let tentativas = 0
    const maxTentativas = tipoChamada.value === TipoChamada.Video ? 40 : 12
    const atrasoTentativa = tipoChamada.value === TipoChamada.Video ? 1000 : 800

    while (tentativas++ < maxTentativas) {
      try {
        resposta = await fetch(`${getMediaMtxUrl()}/${caminhoStream}/whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription!.sdp
        })
        if (resposta.ok) {
          console.debug('[CALL][WHEP] sucesso', { fromUserId, caminhoStream, tentativa: tentativas, status: resposta.status })
          break
        }
        console.debug('[CALL][WHEP] tentativa sem stream', { fromUserId, caminhoStream, tentativa: tentativas, status: resposta.status })
      } catch (err) {
        console.warn('[CALL][WHEP] erro na tentativa', { fromUserId, tentativa: tentativas, erro: err })
      }
      await atraso(atrasoTentativa)
    }

    if (!resposta?.ok) {
      pc.close()
      throw new Error(`WHEP erro: ${resposta?.status || 'timeout'}`)
    }

    const answerSdp = await resposta.text()
    const temVideo = answerSdp.includes('m=video')
    const temAudio = answerSdp.includes('m=audio')
    console.debug('[CALL][WHEP] answer SDP', { fromUserId, temVideo, temAudio })

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp
    })

    return { pc, stream: remoteStream }
  }

  // --- Gerenciamento de peers ---

  async function conectarPeer(usuarioId: number, usuarioNome: string) {
    const meuUsuarioId = getAuthUserId()
    const alvoId = normalizeUserId(usuarioId)
    if (alvoId === null) return
    if (meuUsuarioId !== null && alvoId === meuUsuarioId) return
    let entrada = peers.value.get(alvoId)
    if (!entrada) {
      entrada = {
        usuarioId: alvoId,
        usuarioNome,
        txPc: null,
        rxPc: null,
        stream: null
      }
      peers.value.set(alvoId, entrada)
    } else {
      entrada.usuarioNome = usuarioNome
    }
    notificarPeers()

    try {
      if (streamLocal.value && !pcPublicacaoLocal) {
        pcPublicacaoLocal = await publicarLocalNaSala()
      }
      entrada.txPc = pcPublicacaoLocal

      if (!entrada.rxPc) {
        const { pc, stream } = await assinarDePeer(alvoId)
        entrada.rxPc = pc
        entrada.stream = stream

        // Monitorar conexão WHEP e reconectar se falhar
        pc.onconnectionstatechange = () => {
          const estadoPc = pc.connectionState
          console.debug('[CALL][WHEP] conexão estado', { userId: alvoId, nome: usuarioNome, estado: estadoPc })

          if (estadoPc === 'failed' || estadoPc === 'disconnected') {
            console.warn('[CALL][WHEP] conexão perdida, reconectando...', { userId: alvoId, nome: usuarioNome })
            try { pc.close() } catch { /* ignore */ }
            entrada.rxPc = null
            entrada.stream = null
            notificarPeers()

            if (estado.value === 'ativa') {
              window.setTimeout(() => {
                if (estado.value === 'ativa') {
                  void conectarPeer(alvoId, usuarioNome)
                }
              }, 2000)
            }
          }
        }

        // Verificar se tracks de vídeo chegaram após conexão estabelecida
        if (tipoChamada.value === TipoChamada.Video) {
          window.setTimeout(() => {
            if (entrada.stream && entrada.stream.getVideoTracks().length === 0 && entrada.rxPc) {
              console.warn('[CALL][WHEP] nenhuma track de vídeo após 5s, reconectando...', { userId: alvoId, nome: usuarioNome, connectionState: entrada.rxPc.connectionState })
              try { entrada.rxPc.close() } catch { /* ignore */ }
              entrada.rxPc = null
              entrada.stream = null
              notificarPeers()
              if (estado.value === 'ativa') {
                void conectarPeer(alvoId, usuarioNome)
              }
            }
          }, 5000)
        }
      }

      notificarPeers()
      console.log('[CALL] conectarPeer concluido', {
        userId: alvoId,
        nome: usuarioNome,
        temRxPc: !!entrada.rxPc,
        temStream: !!entrada.stream,
        videoTracks: entrada.stream?.getVideoTracks().length ?? 0,
        audioTracks: entrada.stream?.getAudioTracks().length ?? 0,
        connectionState: entrada.rxPc?.connectionState,
        iceConnectionState: entrada.rxPc?.iceConnectionState
      })
    } catch (e) {
      if (!entrada.rxPc) {
        // Peer pode nao estar transmitindo (modo somente-recepcao)
        console.warn(`[CALL][WHEP] ${usuarioNome} pode nao estar transmitindo ainda`)
      }

      const msgErro = e instanceof Error ? e.message : String(e)
      if (msgErro.includes('WHEP erro: 404')) {
        // 404 costuma ser transitorio (peer ainda nao publicou) ou peer em modo somente-recepcao.
        // Nao elevamos para erro visual; novas sincronizacoes vao tentar novamente.
        console.warn(`[CALL][WHEP] 404 para ${usuarioNome}, aguardando nova sincronizacao`)
        window.setTimeout(() => {
          if (estado.value === 'ativa') {
            void sincronizarPeersAtivos()
          }
        }, 1500)
      } else {
        erroMsg.value = `Erro ao conectar com ${usuarioNome}: ${msgErro}`
      }

      console.error('[CALL] Erro conectarPeer', e)
    }
  }

  function encerrarPublicacaoLocal() {
    if (!pcPublicacaoLocal) return

    const pc = pcPublicacaoLocal
    pcPublicacaoLocal = null
    pc.onconnectionstatechange = null

    try { pc.close() } catch { /* ignore */ }

    for (const [, peer] of peers.value) {
      peer.txPc = null
    }
    notificarPeers()
  }

  function desconectarPeer(usuarioId: number) {
    const peer = peers.value.get(usuarioId)
    if (!peer) return

    try { peer.rxPc?.close() } catch { /* ignore */ }

    peers.value.delete(usuarioId)
    notificarPeers()
  }

  function desconectarTodosPeers() {
    const ids = Array.from(peers.value.keys())
    for (const userId of ids) {
      desconectarPeer(userId)
    }
    encerrarPublicacaoLocal()
  }

  async function sincronizarPeersAtivos() {
    if (!chamada.value || estado.value !== 'ativa') return
    if (sincronizando) return
    sincronizando = true

    try {
      // Atualizar dados da chamada para ter a lista mais recente de participantes
      chamada.value = await api.chamadaDados(chamada.value.id)

      const meuUsuarioId = getAuthUserId()
      if (meuUsuarioId === null) return

      const ativos = chamada.value.usuarios.filter((u) => {
        const id = normalizeUserId(u.usuario_id)
        return id !== null && id !== meuUsuarioId && u.status === StatusUsuarioChamada.Entrou
      })
      const idsAtivos = new Set(ativos.map(u => Number(u.usuario_id)))
      console.log('[CALL] sincronizarPeersAtivos', {
        meuUsuarioId,
        ativos: Array.from(idsAtivos),
        todosUsuarios: chamada.value.usuarios.map(u => ({
          id: u.usuario_id,
          status: u.status,
          nome: u.usuario_nome
        })),
        peersAtuais: Array.from(peers.value.entries()).map(([id, p]) => ({
          id,
          temRxPc: !!p.rxPc,
          temStream: !!p.stream,
          audioTracks: p.stream?.getAudioTracks().length ?? 0,
          videoTracks: p.stream?.getVideoTracks().length ?? 0,
          connectionState: p.rxPc?.connectionState
        }))
      })

      for (const [userId] of peers.value) {
        if (!idsAtivos.has(userId)) {
          desconectarPeer(userId)
        }
      }

      for (const usuario of ativos) {
        const userId = Number(usuario.usuario_id)
        const peerExistente = peers.value.get(userId)

        // Reconectar se o peer existe mas a conexão falhou ou não tem tracks
        if (peerExistente?.rxPc) {
          const estadoConexao = peerExistente.rxPc.connectionState
          const semAudio = !peerExistente.stream || peerExistente.stream.getAudioTracks().length === 0
          const semVideoEmChamadaVideo = tipoChamada.value === TipoChamada.Video &&
            (!peerExistente.stream || peerExistente.stream.getVideoTracks().length === 0)

          if (estadoConexao === 'failed' || estadoConexao === 'disconnected' || estadoConexao === 'closed' || semAudio || semVideoEmChamadaVideo) {
            console.warn('[CALL] reconectando peer com problema', {
              userId,
              nome: usuario.usuario_nome,
              connectionState: estadoConexao,
              audioTracks: peerExistente.stream?.getAudioTracks().length ?? 0,
              videoTracks: peerExistente.stream?.getVideoTracks().length ?? 0
            })
            try { peerExistente.rxPc.close() } catch { /* ignore */ }
            peerExistente.rxPc = null
            peerExistente.stream = null
            notificarPeers()
          }
        }

        await conectarPeer(userId, usuario.usuario_nome)
      }
    } finally {
      sincronizando = false
    }
  }

  async function sincronizarPeersComRetentativas(totalTentativas = 3) {
    for (let tentativa = 1; tentativa <= totalTentativas; tentativa++) {
      sincronizando = false // Libera guard para cada tentativa
      await sincronizarPeersAtivos()
      if (tentativa < totalTentativas) {
        await atraso(tentativa * 1000)
      }
    }
  }

  // --- Media local ---

  async function adquirirMidiaLocal(tipo: TipoChamada): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(criarConstraintsMidia(tipo))
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
    console.debug('[CALL] resetarEstado, estado anterior:', estado.value)
    pararTimerDuracao()
    duracaoChamadaSegundos.value = 0
    estado.value = 'inativo'
    chamada.value = null
    micMutado.value = false
    cameraMutada.value = false
    saidaAudioMutada.value = false
    compartilhandoTela.value = false
    erroMsg.value = ''
    videoAtivadoPor.value = null
    if (videoAtivadoTimeout !== null) {
      window.clearTimeout(videoAtivadoTimeout)
      videoAtivadoTimeout = null
    }
  }

  // --- Acoes de chamada ---

  async function iniciarChamada(tipo: TipoChamada, usuarios: Array<{ id: number }>, comTela = false) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Usuario nao autenticado')
    if (estado.value !== 'inativo') throw new Error('Ja existe uma chamada em andamento')

    erroMsg.value = ''
    tipoChamada.value = tipo

    try {
      if (comTela && tipo === TipoChamada.Video) {
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

      // Publicar stream local no MediaMTX imediatamente para que esteja disponível
      // quando o receptor aceitar e tentar assinar via WHEP.
      try {
        pcPublicacaoLocal = await publicarLocalNaSala()
        console.debug('[CALL] Stream local publicado após iniciar chamada')
      } catch (whipErr) {
        console.warn('[CALL] Falha ao publicar stream local após iniciar chamada', whipErr)
      }
    } catch (e) {
      liberarMidiaLocal()
      resetarEstado()
      throw e
    }
  }

  async function aceitarChamada() {
    if (!chamada.value || estado.value !== 'recebendo') return
    erroMsg.value = ''
    cancelarTemporizadorToque()

    try {
      // Tenta adquirir midia: video+audio → audio → sem midia (somente recepcao).
      // Permite entrar mesmo sem webcam/microfone para assistir a transmissao.
      if (!streamLocal.value) {
        try {
          streamLocal.value = await adquirirMidiaLocal(tipoChamada.value)
        } catch {
          if (tipoChamada.value === TipoChamada.Video) {
            try {
              streamLocal.value = await adquirirMidiaLocal(TipoChamada.Audio)
            } catch {
              console.warn('[CALL] Sem dispositivos de midia, entrando em modo somente recepcao')
            }
          } else {
            try {
              streamLocal.value = await adquirirMidiaLocal(TipoChamada.Audio)
            } catch {
              console.warn('[CALL] Sem dispositivos de midia, entrando em modo somente recepcao')
            }
          }
        }
      }
      await api.chamadaEntrar(chamada.value.id)
      estado.value = 'ativa'
      iniciarTimerDuracao()

      // Publicar stream local no MediaMTX antes de sincronizar peers
      // para que o caller já consiga assinar via WHEP.
      if (streamLocal.value) {
        try {
          pcPublicacaoLocal = await publicarLocalNaSala()
          console.debug('[CALL] Stream local publicado após aceitar chamada')
        } catch (whipErr) {
          console.warn('[CALL] Falha ao publicar stream local após aceitar chamada', whipErr)
        }
      }

      chamada.value = await api.chamadaDados(chamada.value.id)
      await sincronizarPeersComRetentativas()
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
    if (!streamLocal.value || tipoChamada.value !== TipoChamada.Video) return
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
    if (compartilhandoTela.value || tipoChamada.value !== TipoChamada.Video || !streamLocal.value) return

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

    const video = opcoes?.video ?? (tipoChamada.value === TipoChamada.Video)
    streamLocal.value = await adquirirMidiaLocal(video ? TipoChamada.Video : TipoChamada.Audio)

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

  async function upgradeParaVideo(notificar = true) {
    if (tipoChamada.value !== TipoChamada.Audio || estado.value !== 'ativa') return

    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
    const videoTrack = videoStream.getVideoTracks()[0]

    if (streamLocal.value) {
      streamLocal.value.addTrack(videoTrack)
    } else {
      // Se nao tinha stream local, adquire audio tambem
      streamLocal.value = await adquirirMidiaLocal(TipoChamada.Video)
    }

    tipoChamada.value = TipoChamada.Video

    // Reconecta peers para enviar video
    const peersAtuais = Array.from(peers.value.entries()).map(([id, p]) => ({
      id,
      nome: p.usuarioNome
    }))
    desconectarTodosPeers()
    for (const peer of peersAtuais) {
      await conectarPeer(peer.id, peer.nome)
    }

    // Notifica outros participantes sobre o upgrade
    if (notificar && chamada.value) {
      api.chamadaVideo(chamada.value.id).catch(() => { /* ignore */ })
    }
  }

  async function responderUpgradeVideo(transmitir: boolean) {
    videoAtivadoPor.value = null
    if (videoAtivadoTimeout !== null) {
      window.clearTimeout(videoAtivadoTimeout)
      videoAtivadoTimeout = null
    }

    // Sempre faz upgrade completo (adquire camera + reconecta) sem notificar
    await upgradeParaVideo(false)

    if (!transmitir) {
      // Apenas assistir: desabilita camera, usuario pode ativar depois pelo botao
      if (streamLocal.value) {
        streamLocal.value.getVideoTracks().forEach(t => { t.enabled = false })
      }
      cameraMutada.value = true
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
    const meuUsuarioId = getAuthUserId()
    if (meuUsuarioId === null) return
    const eventoUsuarioId = normalizeUserId(evento.usuario_id)
    console.log('[CALL] Evento recebido:', evento.tipo, 'chamada_id:', evento.chamada_id, 'usuario_id:', evento.usuario_id, 'estado atual:', estado.value)

    switch (evento.tipo) {
      case TipoEventoSocket.ChamadaRecebida: {
        if (eventoUsuarioId !== null && eventoUsuarioId === meuUsuarioId && estado.value === 'inativo') {
          return
        }
        if (
          chamada.value?.id === evento.chamada_id &&
          (emChamada.value || estado.value === 'recebendo')
        ) {
          try {
            await sincronizarPeersComRetentativas(2)
          } catch {
            // ignore
          }
          return
        }

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

      case TipoEventoSocket.ChamadaFinalizada: {
        if (chamada.value?.id === evento.chamada_id) {
          cancelarTemporizadorToque()
          desconectarTodosPeers()
          liberarMidiaLocal()
          resetarEstado()
        }
        break
      }

      case TipoEventoSocket.UsuarioRecusou: {
        if (chamada.value?.id === evento.chamada_id) {
          chamada.value = await api.chamadaDados(evento.chamada_id)

          if (chamada.value.usuarios.length === 2) {
            const outroUsuario = chamada.value.usuarios.find(
              u => Number(u.usuario_id) !== meuUsuarioId
            )
            if (outroUsuario?.status === StatusUsuarioChamada.Recusou) {
              desconectarTodosPeers()
              liberarMidiaLocal()
              resetarEstado()
            }
          }
        }
        break
      }

      case TipoEventoSocket.UsuarioEntrou: {
        // Ignorar evento do próprio usuário (o caller recebe seu próprio UsuarioEntrou
        // quando inicia a chamada, não deve transicionar para 'ativa' por isso)
        if (eventoUsuarioId !== null && eventoUsuarioId === meuUsuarioId) {
          console.debug('[CALL] Ignorando UsuarioEntrou do próprio usuário')
          break
        }

        if (chamada.value?.id === evento.chamada_id && estado.value === 'chamando') {
          estado.value = 'ativa'
          iniciarTimerDuracao()
        }

        if (chamada.value?.id === evento.chamada_id && estado.value === 'ativa') {
          await sincronizarPeersComRetentativas()
        }
        break
      }

      case TipoEventoSocket.UsuarioSaiu: {
        if (chamada.value?.id === evento.chamada_id) {
          desconectarPeer(Number(evento.usuario_id))
          chamada.value = await api.chamadaDados(evento.chamada_id)

          const outrosAtivos = chamada.value.usuarios.filter(
            u => Number(u.usuario_id) !== meuUsuarioId && u.status === StatusUsuarioChamada.Entrou
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

      case TipoEventoSocket.VideoAtivado: {
        if (chamada.value?.id === evento.chamada_id && eventoUsuarioId !== meuUsuarioId) {
          // Busca nome do usuario que ativou video
          const peer = peers.value.get(eventoUsuarioId!)
          const nome = peer?.usuarioNome
            || chamada.value?.usuarios.find(u => Number(u.usuario_id) === eventoUsuarioId)?.usuario_nome
            || 'Alguém'
          videoAtivadoPor.value = { usuarioId: eventoUsuarioId!, usuarioNome: nome }

          // Auto-dismiss apos 15s escolhendo "apenas assistir"
          if (videoAtivadoTimeout !== null) window.clearTimeout(videoAtivadoTimeout)
          videoAtivadoTimeout = window.setTimeout(() => {
            if (videoAtivadoPor.value) {
              void responderUpgradeVideo(false)
            }
          }, 15000)
        }
        break
      }
    }
  }

  async function verificarChamadasPendentes() {
    if (emChamada.value || estado.value === 'recebendo') return

    let pendentes: Awaited<ReturnType<typeof api.getChamadasPendentes>>
    try {
      pendentes = await api.getChamadasPendentes()
    } catch {
      return
    }

    if (pendentes.length === 0) return

    const chamadaPendente = pendentes[0]
    const idadeMs = Date.now() - new Date(chamadaPendente.criado_em).getTime()

    if (idadeMs > 25000) {
      try { await api.chamadaRecusar(chamadaPendente.id) } catch { /* ignore */ }
      return
    }

    await tratarEventoChamada({
      tipo: 51,
      chamada_id: chamadaPendente.id,
      usuario_id: chamadaPendente.criado_por
    })
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
    videoAtivadoPor,
    responderUpgradeVideo,
    tratarEventoChamada,
    verificarChamadasPendentes,
    encerrarChamada
  }
})
