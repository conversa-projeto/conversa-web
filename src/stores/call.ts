import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useChatStore } from './chat'
import * as api from '../services/conversaApi'
import { TipoChamada, StatusUsuarioChamada, TipoEventoSocket } from '../types/api'
import type { Chamada, EventoChamadaSocket, SinalChamada } from '../types/api'
import { BITRATE_AUDIO, BITRATE_VIDEO, DIMENSOES_VIDEO, useConfigChamada, type ConfigChamada } from '../composables/useConfigChamada'

export type EstadoChamada = 'inativo' | 'chamando' | 'recebendo' | 'ativa' | 'encerrando'

// Ponteiro de outro participante sobre a tela compartilhada por alvo
export interface PonteiroRemoto {
  usuarioId: number
  nome: string
  alvo: number
  x: number
  y: number
}

// Ponteiro parado some depois disto, caso o aviso de saída se perca
const PONTEIRO_SOME_MS = 5000
// Intervalo mínimo entre dois envios da posição do ponteiro
const PONTEIRO_INTERVALO_MS = 40

export interface PeerConexao {
  usuarioId: number
  usuarioNome: string
  txPc: RTCPeerConnection | null
  rxPc: RTCPeerConnection | null
  stream: MediaStream | null
}

const STUN_FALLBACK: RTCIceServer[] = (() => {
  const stunUrl = import.meta.env.VITE_STUN_URL
  if (!stunUrl) return []
  return [{ urls: stunUrl }]
})()

/**
 * Configuracao ICE emitida pelo backend em GET /ice. Traz credenciais TURN
 * temporarias e a politica de transporte (relay-only ou todas). Buscada a
 * cada conexao porque as credenciais expiram.
 */
export async function obterConfigRTC(): Promise<RTCConfiguration> {
  try {
    const cfg = await api.getIceServers()
    if (cfg.iceServers.length) {
      return { iceServers: cfg.iceServers, iceTransportPolicy: cfg.iceTransportPolicy }
    }
  } catch (e) {
    console.warn('[CALL] Falha ao obter servidores ICE, usando caminho direto', e)
  }
  return { iceServers: STUN_FALLBACK }
}

export type EtapaVideo = 'camera' | 'enviando' | 'recebendo'

export const TEXTO_ETAPA_VIDEO: Record<EtapaVideo, string> = {
  camera: 'Abrindo a câmera...',
  enviando: 'Enviando o vídeo...',
  recebendo: 'Recebendo o vídeo dos participantes...',
}

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
  // Quem escolheu "Apenas assistir": a janela da chamada abre em tela única
  // neste participante e limpa o pedido
  const telaUnicaSolicitada = ref<number | null>(null)
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

  // --- Audio dos participantes ---
  //
  // O audio remoto e tocado por elementos criados aqui, que vivem enquanto a
  // chamada durar. Antes quem tocava eram as tags de video da janela e as de
  // audio da barra: ao alternar entre tela cheia e janela flutuante os
  // elementos antigos eram destruidos e os novos nem sempre conseguiam comecar
  // a tocar (politica de reproducao automatica), e o audio sumia. As janelas
  // agora exibem apenas video, sempre mudas.
  const audiosRemotos = new Map<number, HTMLAudioElement>()

  function tocarAudioRemoto(usuarioId: number, stream: MediaStream) {
    let elemento = audiosRemotos.get(usuarioId)
    if (!elemento) {
      elemento = new Audio()
      elemento.autoplay = true
      elemento.setAttribute('playsinline', '')
      audiosRemotos.set(usuarioId, elemento)
    }
    if (elemento.srcObject !== stream) {
      elemento.srcObject = stream
    }
    elemento.muted = saidaAudioMutada.value
    void elemento.play().catch((e) => console.warn('[CALL] audio remoto nao iniciou', { usuarioId, e }))
  }

  function pararAudioRemoto(usuarioId: number) {
    const elemento = audiosRemotos.get(usuarioId)
    if (!elemento) return
    elemento.pause()
    elemento.srcObject = null
    audiosRemotos.delete(usuarioId)
  }

  function pararAudiosRemotos() {
    for (const usuarioId of Array.from(audiosRemotos.keys())) {
      pararAudioRemoto(usuarioId)
    }
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

  // Convidados que não estão na chamada: tocando (Pendente) ou que não
  // atenderam (Recusou, sem nunca ter entrado), que podem ser chamados de novo
  const participantesAguardando = computed(() => {
    if (!chamada.value) return []
    const meuId = Number(useAuthStore().user?.id)
    return chamada.value.usuarios.filter((u) => {
      const id = Number(u.usuario_id)
      if (id === meuId || peers.value.has(id)) return false
      return u.status === StatusUsuarioChamada.Pendente || (u.status === StatusUsuarioChamada.Recusou && !u.entrou_em)
    })
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
    const webrtcPath = import.meta.env.VITE_WEBRTC_PATH || '/webrtc'
    return `${window.location.origin}${webrtcPath}`
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
      // 5s: a alocacao TURN sobre TLS na primeira conexao passa de 3s, e sem
      // trickle ICE o candidato relay que nao chegar a tempo fica fora do SDP.
      const timer = setTimeout(() => {
        pc.onicegatheringstatechange = null
        resolve()
      }, 5000)
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

  // Qualidade da chamada escolhida em Configurações > Chamadas
  const { config: configChamada } = useConfigChamada()

  function constraintsAudio(): MediaTrackConstraints {
    const c = configChamada.value
    return {
      echoCancellation: c.cancelamentoEco,
      noiseSuppression: c.reducaoRuido,
      autoGainControl: c.ganhoAutomatico,
      channelCount: c.qualidadeAudio === 'musica' ? 2 : 1
    }
  }

  function constraintsVideo(): MediaTrackConstraints {
    const c = configChamada.value
    const { width, height } = DIMENSOES_VIDEO[c.resolucao]
    return {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: c.fps, max: c.fps },
      ...(isMobileDevice() ? { facingMode: 'user' } : {})
    }
  }

  function criarConstraintsMidia(tipo: TipoChamada): MediaStreamConstraints {
    return { audio: constraintsAudio(), video: tipo === TipoChamada.Video ? constraintsVideo() : false }
  }

  // Áudio em estéreo (qualidade "Música") precisa ser pedido no SDP do Opus
  function sdpComOpusEstereo(sdp: string) {
    const opus = sdp.match(/a=rtpmap:(\d+) opus\/48000/i)
    if (!opus) return sdp
    return sdp.replace(new RegExp(`a=fmtp:${opus[1]} ([^\r\n]*)`), (linha, params: string) =>
      /stereo=1/.test(params) ? linha : `a=fmtp:${opus[1]} ${params};stereo=1;sprop-stereo=1`)
  }

  // Limites de envio da transmissão: bitrate do áudio, bitrate e fps do vídeo.
  // Na tela, a prioridade decide entre manter a nitidez ou a fluidez quando a
  // banda aperta.
  async function aplicarParametrosEnvio(pc: RTCPeerConnection | null = pcPublicacaoLocal) {
    if (!pc) return
    const c = configChamada.value
    for (const transceiver of pc.getTransceivers()) {
      const sender = transceiver.sender
      const parametros = sender.getParameters()
      const codificacao = parametros.encodings?.[0]
      if (!codificacao) continue
      if (transceiver.receiver.track.kind === 'audio') {
        codificacao.maxBitrate = BITRATE_AUDIO[c.qualidadeAudio]
      } else {
        const bitrate = BITRATE_VIDEO[c.bandaVideo]
        if (bitrate) codificacao.maxBitrate = bitrate
        else delete codificacao.maxBitrate
        if (compartilhandoTela.value) {
          codificacao.maxFramerate = c.prioridadeTela === 'nitidez' ? 15 : 30
          parametros.degradationPreference = c.prioridadeTela === 'nitidez' ? 'maintain-resolution' : 'maintain-framerate'
        } else {
          codificacao.maxFramerate = c.fps
          delete parametros.degradationPreference
        }
      }
      try {
        await sender.setParameters(parametros)
      } catch (e) {
        console.warn('[CALL] Não foi possível aplicar a qualidade de envio', e)
      }
    }
  }

  function aplicarPrioridadeTela() {
    const dica = configChamada.value.prioridadeTela === 'nitidez' ? 'detail' : 'motion'
    streamTela.value?.getVideoTracks().forEach(t => { t.contentHint = dica })
  }

  // As chamadas são gravadas no MediaMTX, que não grava VP8 (o padrão do
  // navegador). O vídeo sai em H264 ou, sem ele, em VP9; os demais ficam por
  // último, para a chamada funcionar mesmo sem gravar.
  const CODECS_GRAVAVEIS = ['video/H264', 'video/VP9']

  function preferirCodecsGravaveis(pc: RTCPeerConnection) {
    const codecs = RTCRtpSender.getCapabilities?.('video')?.codecs
    if (!codecs) return
    const prioridade = (mime: string) => {
      const indice = CODECS_GRAVAVEIS.indexOf(mime)
      return indice === -1 ? CODECS_GRAVAVEIS.length : indice
    }
    const ordenados = [...codecs].sort((a, b) => prioridade(a.mimeType) - prioridade(b.mimeType))
    for (const transceiver of pc.getTransceivers()) {
      if (transceiver.sender.track?.kind === 'video') transceiver.setCodecPreferences?.(ordenados)
    }
  }

  // --- WHIP: publicar stream local para um peer ---

  async function publicarLocalNaSala(): Promise<RTCPeerConnection> {
    const auth = useAuthStore()
    if (!auth.user || !streamLocal.value) {
      throw new Error('Stream local ou usuario nao disponivel')
    }
    const chamadaId = getChamadaIdAtual()

    const pc = new RTCPeerConnection(await obterConfigRTC())
    // O MediaMTX recusa (406) transmissão com mais de uma trilha de cada tipo
    const ativa = (lista: MediaStreamTrack[]) => lista.find(t => t.readyState === 'live') || lista[0]
    const trilhas = [ativa(streamLocal.value.getAudioTracks()), ativa(streamLocal.value.getVideoTracks())]
    trilhas.forEach(t => { if (t) pc.addTrack(t, streamLocal.value!) })
    preferirCodecsGravaveis(pc)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(configChamada.value.qualidadeAudio === 'musica'
      ? { type: 'offer', sdp: sdpComOpusEstereo(offer.sdp || '') }
      : offer)
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

    await aplicarParametrosEnvio(pc)
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

    const pc = new RTCPeerConnection(await obterConfigRTC())
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
        try { remoteStream.removeTrack(e.track) } catch { /* ignore */ }
        notificarPeers()
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

    // Aceita áudio estéreo de quem transmite na qualidade "Música"
    const offer = await pc.createOffer()
    await pc.setLocalDescription({ type: 'offer', sdp: sdpComOpusEstereo(offer.sdp || '') })
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
        tocarAudioRemoto(alvoId, stream)
        monitorarAssinatura(entrada, pc)

        // Verificar se tracks de vídeo chegaram após conexão estabelecida
        if (tipoChamada.value === TipoChamada.Video) {
          window.setTimeout(() => {
            if (entrada.stream && entrada.stream.getVideoTracks().length === 0 && entrada.rxPc) {
              console.warn('[CALL][WHEP] nenhuma track de vídeo após 5s, reconectando...', { userId: alvoId, nome: usuarioNome, connectionState: entrada.rxPc.connectionState })
              try { entrada.rxPc.close() } catch { /* ignore */ }
              entrada.rxPc = null
              entrada.stream = null
              pararAudioRemoto(alvoId)
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
    pararAudioRemoto(usuarioId)

    peers.value.delete(usuarioId)
    notificarPeers()
    esquecerTelaDe(usuarioId)
  }

  // Refaz a assinatura de um participante: usado quando ele republica a
  // transmissao (ao ativar o video, por exemplo) e o fluxo antigo morre.
  // Monitorar conexão WHEP e reconectar se falhar
  function monitorarAssinatura(entrada: PeerConexao, pc: RTCPeerConnection) {
    pc.onconnectionstatechange = () => {
      const estadoPc = pc.connectionState
      console.debug('[CALL][WHEP] conexão estado', { userId: entrada.usuarioId, nome: entrada.usuarioNome, estado: estadoPc })

      if ((estadoPc === 'failed' || estadoPc === 'disconnected') && entrada.rxPc === pc) {
        console.warn('[CALL][WHEP] conexão perdida, reconectando...', { userId: entrada.usuarioId, nome: entrada.usuarioNome })
        try { pc.close() } catch { /* ignore */ }
        entrada.rxPc = null
        entrada.stream = null
        pararAudioRemoto(entrada.usuarioId)
        notificarPeers()

        if (estado.value === 'ativa') {
          window.setTimeout(() => {
            if (estado.value === 'ativa') {
              void conectarPeer(entrada.usuarioId, entrada.usuarioNome)
            }
          }, 2000)
        }
      }
    }
  }

  // Assina de novo sem cortar: a assinatura nova (com o vídeo, se a chamada já
  // for de vídeo) entra no lugar da antiga, que só fecha depois. Enquanto isso o
  // áudio segue pela antiga, se ela ainda estiver de pé.
  async function trocarAssinatura(usuarioId: number) {
    const peer = peers.value.get(usuarioId)
    if (!peer || estado.value !== 'ativa') return
    try {
      const { pc, stream } = await assinarDePeer(usuarioId)
      const antiga = peer.rxPc
      peer.rxPc = pc
      peer.stream = stream
      tocarAudioRemoto(usuarioId, stream)
      monitorarAssinatura(peer, pc)
      if (antiga && antiga !== pc) {
        antiga.onconnectionstatechange = null
        try { antiga.close() } catch { /* ignore */ }
      }
      notificarPeers()
    } catch (e) {
      console.warn('[CALL][WHEP] troca de assinatura falhou, assinando de novo', { usuarioId, e })
      await reassinarPeer(usuarioId)
    }
  }

  async function reassinarPeer(usuarioId: number) {
    const peer = peers.value.get(usuarioId)
    if (!peer || estado.value !== 'ativa') return

    try { peer.rxPc?.close() } catch { /* ignore */ }
    pararAudioRemoto(usuarioId)
    peer.rxPc = null
    peer.stream = null
    notificarPeers()

    await conectarPeer(usuarioId, peer.usuarioNome)
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
          const vivas = (faixas: MediaStreamTrack[]) => faixas.filter(t => t.readyState === 'live').length
          const semAudio = !peerExistente.stream || vivas(peerExistente.stream.getAudioTracks()) === 0
          const semVideoEmChamadaVideo = tipoChamada.value === TipoChamada.Video &&
            (!peerExistente.stream || vivas(peerExistente.stream.getVideoTracks()) === 0)

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
    encerrarMisturaAudio()
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
    pararAudiosRemotos()
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
    telaUnicaSolicitada.value = null
    limparTelasCompartilhadas()
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
        const telaStream = await navigator.mediaDevices.getDisplayMedia(OPCOES_TELA)
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraintsAudio() })
        streamLocal.value = new MediaStream([
          ...audioStream.getAudioTracks(),
          ...telaStream.getVideoTracks()
        ])
        streamTela.value = telaStream
        compartilhandoTela.value = true
        trackCamera = null
        aplicarPrioridadeTela()

        const trilhaTela = telaStream.getVideoTracks()[0]
        if (trilhaTela) trilhaTela.onended = () => { void pararCompartilhamento() }
      } else {
        try {
          streamLocal.value = await adquirirMidiaLocal(tipo)
        } catch {
          if (tipo === TipoChamada.Video) {
            // Sem webcam: entra com audio apenas
            streamLocal.value = await adquirirMidiaLocal(TipoChamada.Audio)
          } else {
            throw new Error('Nao foi possivel acessar o microfone')
          }
        }
      }

      estado.value = 'chamando'
      const chatStore = useChatStore()
      chamada.value = await api.chamadaIniciar(tipo, usuarios, chatStore.conversaAtivaId)

      // Publicar stream local no MediaMTX imediatamente para que esteja disponível
      // quando o receptor aceitar e tentar assinar via WHEP.
      try {
        pcPublicacaoLocal = await publicarLocalNaSala()
        console.debug('[CALL] Stream local publicado após iniciar chamada')
        if (streamTela.value) await misturarAudioDaTela(streamTela.value)
      } catch (whipErr) {
        console.warn('[CALL] Falha ao publicar stream local após iniciar chamada', whipErr)
      }
    } catch (e) {
      liberarMidiaLocal()
      resetarEstado()
      throw e
    }
  }

  // Enquanto esta aba atende, o aviso de que o usuário entrou é dela mesma
  let atendendoAqui = false

  // apenasAssistir: entra com a câmera desligada (pode ligar depois pelo botão).
  async function aceitarChamada(apenasAssistir = false) {
    if (!chamada.value || estado.value !== 'recebendo') return
    erroMsg.value = ''
    cancelarTemporizadorToque()
    atendendoAqui = true

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
      if (apenasAssistir && streamLocal.value) {
        streamLocal.value.getVideoTracks().forEach(t => { t.enabled = false })
        cameraMutada.value = true
      }
      await api.chamadaEntrar(chamada.value.id)
      estado.value = 'ativa'
      iniciarTimerDuracao()

      // Chamada de vídeo sem enviar vídeo (escolheu só assistir, ou está sem
      // câmera): abre em tela única em quem ligou. Pedido feito já aqui, antes
      // de conectar aos outros, que pode levar alguns segundos: a janela da
      // chamada espera o primeiro participante chegar para aplicar.
      const enviaVideo = !!streamLocal.value?.getVideoTracks().some(t => t.enabled)
      if (tipoChamada.value === TipoChamada.Video && !enviaVideo) {
        telaUnicaSolicitada.value = normalizeUserId(chamadaRemetente.value?.usuario_id) ?? 0
      }

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
    } finally {
      atendendoAqui = false
    }
  }

  // naoAtendeu: tocou até o fim sem resposta (vira chamada perdida)
  async function recusarChamada(naoAtendeu = false) {
    if (!chamada.value || estado.value !== 'recebendo') return

    cancelarTemporizadorToque()

    try {
      await api.chamadaRecusar(chamada.value.id, naoAtendeu)
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
    for (const [, elemento] of audiosRemotos) {
      elemento.muted = saidaAudioMutada.value
    }
  }

  // --- Compartilhamento de tela ---

  // Transceiver de video da publicacao WHIP. Pelo receiver, porque o sender
  // pode estar sem track depois de um replaceTrack(null).
  // Tela com o som do computador: o navegador mostra a opção de compartilhar o
  // áudio (Chrome/Edge: aba sempre; tela inteira no Windows; janela não tem).
  // restrictOwnAudio tira desta captura o som da própria página, ou seja, as
  // vozes da chamada; sem isso os outros ouviriam o próprio eco.
  const OPCOES_TELA = {
    video: true,
    audio: { restrictOwnAudio: true, suppressLocalAudioPlayback: false },
    systemAudio: 'include'
  } as DisplayMediaStreamOptions

  function transceiverAudioPublicado() {
    return pcPublicacaoLocal?.getTransceivers().find(t => t.receiver.track.kind === 'audio') || null
  }

  // A transmissão tem uma trilha de áudio só (é a que os outros recebem). O som
  // do computador e o microfone viram uma trilha, que substitui a do microfone.
  // O microfone continua em streamLocal: mutá-lo silencia só a voz.
  let misturaAudioTela: { contexto: AudioContext; trilha: MediaStreamTrack } | null = null

  async function misturarAudioDaTela(telaStream: MediaStream) {
    const somTela = telaStream.getAudioTracks()[0]
    const transceiver = transceiverAudioPublicado()
    // Sem "compartilhar áudio" marcado, ou sem microfone na transmissão
    if (!somTela || !transceiver) return
    const contexto = new AudioContext()
    const destino = contexto.createMediaStreamDestination()
    contexto.createMediaStreamSource(new MediaStream([somTela])).connect(destino)
    const microfone = streamLocal.value?.getAudioTracks()[0]
    if (microfone) contexto.createMediaStreamSource(new MediaStream([microfone])).connect(destino)
    const trilha = destino.stream.getAudioTracks()[0]
    if (!trilha) return
    await transceiver.sender.replaceTrack(trilha)
    misturaAudioTela = { contexto, trilha }
  }

  function encerrarMisturaAudio() {
    if (!misturaAudioTela) return
    misturaAudioTela.trilha.stop()
    void misturaAudioTela.contexto.close().catch(() => {})
    misturaAudioTela = null
  }

  async function desfazerMisturaAudio() {
    if (!misturaAudioTela) return
    await transceiverAudioPublicado()?.sender.replaceTrack(streamLocal.value?.getAudioTracks()[0] || null)
    encerrarMisturaAudio()
  }

  function transceiverVideoPublicado() {
    return pcPublicacaoLocal?.getTransceivers().find(t => t.receiver.track.kind === 'video') || null
  }

  async function compartilharTela() {
    if (compartilhandoTela.value || tipoChamada.value !== TipoChamada.Video || !chamada.value) return

    const telaStream = await navigator.mediaDevices.getDisplayMedia(OPCOES_TELA)
    const screenTrack = telaStream.getVideoTracks()[0]
    if (!screenTrack) return

    // Salva track da câmera para restaurar depois
    trackCamera = streamLocal.value?.getVideoTracks()[0] || null

    // Stream novo (e não a troca da trilha no mesmo) para o tile local se
    // religar e mostrar a tela: trocando no mesmo, ele seguia com a câmera
    streamLocal.value = new MediaStream([...(streamLocal.value?.getAudioTracks() ?? []), screenTrack])

    streamTela.value = telaStream
    compartilhandoTela.value = true
    aplicarPrioridadeTela()

    screenTrack.onended = () => { void pararCompartilhamento() }

    const transceiver = transceiverVideoPublicado()
    if (transceiver) {
      await transceiver.sender.replaceTrack(screenTrack)
    } else {
      // Sem camera a publicacao so tem audio e nao ha onde trocar o video:
      // publica de novo ja com a tela e avisa os outros para assinarem de novo.
      encerrarPublicacaoLocal()
      pcPublicacaoLocal = await publicarLocalNaSala()
      for (const [, peer] of peers.value) {
        peer.txPc = pcPublicacaoLocal
      }
      notificarPeers()
      if (chamada.value) api.chamadaVideo(chamada.value.id).catch(() => { /* ignore */ })
    }

    await misturarAudioDaTela(telaStream)
    await aplicarParametrosEnvio()
  }

  async function pararCompartilhamento() {
    if (!compartilhandoTela.value || !streamLocal.value) return

    // Restaura track da câmera ou adquire nova
    if (!trackCamera) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: constraintsVideo() })
        trackCamera = camStream.getVideoTracks()[0] ?? null
      } catch {
        // Câmera indisponível
      }
    }

    // Troca de volta na publicação WHIP
    await transceiverVideoPublicado()?.sender.replaceTrack(trackCamera)

    // Volta a câmera no tile local, também num stream novo
    streamLocal.value = new MediaStream([...streamLocal.value.getAudioTracks(), ...(trackCamera ? [trackCamera] : [])])

    // Volta só o microfone na transmissão
    await desfazerMisturaAudio()

    // Para as tracks da tela
    streamTela.value?.getTracks().forEach(t => t.stop())
    streamTela.value = null
    compartilhandoTela.value = false
    trackCamera = null
    await aplicarParametrosEnvio()
  }

  // --- Qualidade alterada durante a chamada ---

  // Redução de ruído, eco e ganho: o navegador só aplica ao abrir o microfone,
  // então ele é reaberto e trocado na transmissão sem derrubar a chamada.
  async function reabrirMicrofone() {
    const stream = streamLocal.value
    const antigo = stream?.getAudioTracks()[0]
    if (!stream || !antigo) return
    let novo: MediaStreamTrack | undefined
    try {
      novo = (await navigator.mediaDevices.getUserMedia({ audio: constraintsAudio() })).getAudioTracks()[0]
    } catch {
      return
    }
    if (!novo) return
    novo.enabled = !micMutado.value
    stream.removeTrack(antigo)
    stream.addTrack(novo)
    if (misturaAudioTela && streamTela.value) {
      encerrarMisturaAudio()
      await misturarAudioDaTela(streamTela.value)
    } else {
      await transceiverAudioPublicado()?.sender.replaceTrack(novo)
    }
    antigo.stop()
  }

  async function aplicarConfigAoVivo(novo: ConfigChamada, antigo: ConfigChamada) {
    if (!streamLocal.value || !emChamada.value) return
    const mudou = (chave: keyof ConfigChamada) => novo[chave] !== antigo[chave]
    if (mudou('reducaoRuido') || mudou('cancelamentoEco') || mudou('ganhoAutomatico') || mudou('qualidadeAudio')) {
      await reabrirMicrofone()
    }
    if ((mudou('resolucao') || mudou('fps')) && !compartilhandoTela.value) {
      await streamLocal.value.getVideoTracks()[0]?.applyConstraints(constraintsVideo()).catch(() => {})
    }
    if (mudou('prioridadeTela')) aplicarPrioridadeTela()
    await aplicarParametrosEnvio()
  }

  watch(() => ({ ...configChamada.value }), (novo, antigo) => { void aplicarConfigAoVivo(novo, antigo) })

  // --- Adicionar usuario a chamada ativa ---

  async function adicionarUsuario(usuarioId: number) {
    if (!chamada.value || estado.value !== 'ativa') return
    await api.chamadaAdicionarUsuario(chamada.value.id, usuarioId)
    chamada.value = await api.chamadaDados(chamada.value.id)
  }

  async function chamarNovamente(usuarioId: number) {
    if (!chamada.value) return
    chamada.value = await api.chamadaChamarNovamente(chamada.value.id, usuarioId)
  }

  async function atualizarDadosChamada(chamadaId: number) {
    try {
      const dados = await api.chamadaDados(chamadaId)
      if (chamada.value?.id === chamadaId) chamada.value = dados
    } catch {
      // segue com a lista que tinha
    }
  }

  // --- Iniciar transmissao local (receptor que quer comecar a transmitir) ---

  async function iniciarTransmissaoLocal(opcoes?: { video?: boolean }) {
    if (estado.value !== 'ativa') return

    const video = opcoes?.video ?? (tipoChamada.value === TipoChamada.Video)
    try {
      streamLocal.value = await adquirirMidiaLocal(video ? TipoChamada.Video : TipoChamada.Audio)
    } catch {
      if (video) {
        // Sem webcam: transmite somente audio
        streamLocal.value = await adquirirMidiaLocal(TipoChamada.Audio)
      } else {
        throw new Error('Nao foi possivel acessar o microfone')
      }
    }

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

  // Dois pedidos juntos (clique duplo, ou clique e o tempo do aviso) abririam
  // duas câmeras, e a transmissão com dois vídeos é recusada
  let ativandoVideo = false

  // Etapa de ligar o vídeo numa chamada de áudio, para a janela mostrar o andamento
  const etapaVideo = ref<EtapaVideo | null>(null)

  // transmitir: false abre a câmera desligada (só assistir; dá para ligar depois)
  async function upgradeParaVideo(notificar = true, transmitir = true) {
    if (tipoChamada.value !== TipoChamada.Audio || estado.value !== 'ativa' || ativandoVideo) return
    ativandoVideo = true
    try {
      await ativarVideo(notificar, transmitir)
    } finally {
      ativandoVideo = false
      etapaVideo.value = null
    }
  }

  // Sem derrubar a chamada: a transmissão nova (com o vídeo) é publicada antes
  // de fechar a antiga, e cada assinatura é trocada só quando a nova está pronta.
  async function ativarVideo(notificar: boolean, transmitir: boolean) {
    etapaVideo.value = 'camera'
    // Tenta adquirir video, mas continua sem webcam para poder assistir
    try {
      if (streamLocal.value) {
        const videoTrack = (await navigator.mediaDevices.getUserMedia({ video: constraintsVideo() })).getVideoTracks()[0]
        // Stream novo, para o tile local se religar com o vídeo
        if (videoTrack) streamLocal.value = new MediaStream([...streamLocal.value.getAudioTracks(), videoTrack])
      } else {
        streamLocal.value = await adquirirMidiaLocal(TipoChamada.Video)
      }
    } catch {
      // Sem webcam: continua sem video local, mas muda tipoChamada
      // para receber streams de video dos outros participantes
      console.warn('[CALL] Webcam indisponivel, entrando em modo somente recepcao de video')
    }
    if (!transmitir) {
      streamLocal.value?.getVideoTracks().forEach(t => { t.enabled = false })
      cameraMutada.value = true
    }

    tipoChamada.value = TipoChamada.Video

    if (streamLocal.value?.getVideoTracks().length) {
      etapaVideo.value = 'enviando'
      await republicarSemInterromper()
    }

    // Notifica outros participantes sobre o upgrade
    if (notificar && chamada.value) {
      api.chamadaVideo(chamada.value.id).catch(() => { /* ignore */ })
    }

    etapaVideo.value = 'recebendo'
    await Promise.all(Array.from(peers.value.keys()).map(id => trocarAssinatura(id)))
  }

  // Publica de novo no mesmo caminho: o MediaMTX troca a transmissão antiga pela
  // nova, sem intervalo. Se ele recusar a troca, fecha a antiga e publica.
  async function republicarSemInterromper() {
    const antiga = pcPublicacaoLocal
    // A antiga cai quando a nova entra: não é para tentar restabelecer
    if (antiga) antiga.onconnectionstatechange = null
    let nova: RTCPeerConnection
    try {
      nova = await publicarLocalNaSala()
    } catch (e) {
      if (!antiga) throw e
      console.warn('[CALL][WHIP] troca recusada, publicando depois de fechar a antiga', e)
      encerrarPublicacaoLocal()
      nova = await publicarLocalNaSala()
    }
    if (antiga && pcPublicacaoLocal === antiga) {
      try { antiga.close() } catch { /* ignore */ }
    }
    pcPublicacaoLocal = nova
    for (const [, peer] of peers.value) {
      peer.txPc = nova
    }
    notificarPeers()
  }

  async function responderUpgradeVideo(transmitir: boolean) {
    const quemAtivou = videoAtivadoPor.value?.usuarioId ?? null
    videoAtivadoPor.value = null
    if (videoAtivadoTimeout !== null) {
      window.clearTimeout(videoAtivadoTimeout)
      videoAtivadoTimeout = null
    }

    // Sempre faz upgrade completo (adquire camera + reconecta) sem notificar.
    // Apenas assistir: a câmera vai desligada, usuario pode ativar depois pelo botao
    await upgradeParaVideo(false, transmitir)

    if (!transmitir) {
      telaUnicaSolicitada.value = quemAtivou
    }
  }

  // --- Temporizador de toque ---

  function cancelarTemporizadorToque() {
    if (tempoToqueChamada !== null) {
      window.clearTimeout(tempoToqueChamada)
      tempoToqueChamada = null
    }
  }

  // --- Tela compartilhada e ponteiro remoto ---
  //
  // A tela compartilhada vai no lugar da câmera, então quem assiste não sabe
  // que a imagem é uma tela: quem compartilha avisa pelo sinal da chamada. Com
  // o ponteiro ligado, quem assiste manda a posição do mouse sobre a imagem
  // (de 0 a 1), e todos que veem aquela tela, inclusive quem compartilha,
  // desenham o ponteiro dentro do app.

  // Participantes que estão compartilhando a tela agora
  const telasRemotas = ref<Set<number>>(new Set())
  const ponteiros = ref<Map<number, PonteiroRemoto>>(new Map())
  // Ligado por quem assiste, no botão da chamada
  const ponteiroAtivo = ref(false)
  const timersPonteiro = new Map<number, number>()
  let ponteiroPendente: Extract<SinalChamada, { acao: 'ponteiro' }> | null = null
  let timerEnvioPonteiro: number | null = null

  function enviarSinal(dados: SinalChamada) {
    if (!chamada.value) return
    useChatStore().enviarSinalChamada(chamada.value.id, dados)
  }

  function anunciarTela() {
    enviarSinal({ acao: 'tela', ativa: compartilhandoTela.value })
  }

  // Começou ou parou de compartilhar, ou a chamada começou já compartilhando
  watch([compartilhandoTela, () => chamada.value?.id], ([ativa, id], [antes]) => {
    if (id && (ativa || antes)) anunciarTela()
  })

  watch(() => telasRemotas.value.size, (total) => {
    if (total === 0) ponteiroAtivo.value = false
  })

  function alternarPonteiro() {
    ponteiroAtivo.value = !ponteiroAtivo.value && telasRemotas.value.size > 0
  }

  // Posição do mouse sobre a tela de alvo (null quando sai dela). Envia no
  // máximo uma a cada PONTEIRO_INTERVALO_MS; a última sempre vai.
  function moverPonteiro(alvo: number, x: number | null, y: number | null) {
    ponteiroPendente = { acao: 'ponteiro', alvo, x, y }
    if (timerEnvioPonteiro !== null) return
    enviarSinal(ponteiroPendente)
    ponteiroPendente = null
    timerEnvioPonteiro = window.setTimeout(() => {
      timerEnvioPonteiro = null
      if (ponteiroPendente) {
        const { alvo: a, x: px, y: py } = ponteiroPendente
        moverPonteiro(a, px, py)
      }
    }, PONTEIRO_INTERVALO_MS)
  }

  function removerPonteiro(usuarioId: number) {
    const timer = timersPonteiro.get(usuarioId)
    if (timer !== undefined) window.clearTimeout(timer)
    timersPonteiro.delete(usuarioId)
    if (!ponteiros.value.has(usuarioId)) return
    const novo = new Map(ponteiros.value)
    novo.delete(usuarioId)
    ponteiros.value = novo
  }

  function tratarSinal(usuarioId: number, dados: SinalChamada) {
    if (dados.acao === 'tela') {
      const novo = new Set(telasRemotas.value)
      if (dados.ativa) {
        novo.add(usuarioId)
      } else {
        novo.delete(usuarioId)
        for (const ponteiro of ponteiros.value.values()) {
          if (ponteiro.alvo === usuarioId) removerPonteiro(ponteiro.usuarioId)
        }
      }
      telasRemotas.value = novo
      return
    }

    if (dados.acao === 'chat') {
      definirChatChamada(dados.conversa_id)
      return
    }

    if (dados.acao === 'participantes') {
      if (chamada.value) void atualizarDadosChamada(chamada.value.id)
      return
    }

    if (dados.x === null || dados.y === null) {
      removerPonteiro(usuarioId)
      return
    }
    const nome = peers.value.get(usuarioId)?.usuarioNome
      || chamada.value?.usuarios.find(u => Number(u.usuario_id) === usuarioId)?.usuario_nome
      || 'Participante'
    const novo = new Map(ponteiros.value)
    novo.set(usuarioId, { usuarioId, nome, alvo: dados.alvo, x: dados.x, y: dados.y })
    ponteiros.value = novo
    const timer = timersPonteiro.get(usuarioId)
    if (timer !== undefined) window.clearTimeout(timer)
    timersPonteiro.set(usuarioId, window.setTimeout(() => removerPonteiro(usuarioId), PONTEIRO_SOME_MS))
  }

  // Participante saiu: some a tela dele e o ponteiro que ele movia
  function esquecerTelaDe(usuarioId: number) {
    removerPonteiro(usuarioId)
    if (telasRemotas.value.has(usuarioId)) tratarSinal(usuarioId, { acao: 'tela', ativa: false })
  }

  function limparTelasCompartilhadas() {
    for (const timer of timersPonteiro.values()) window.clearTimeout(timer)
    timersPonteiro.clear()
    if (timerEnvioPonteiro !== null) window.clearTimeout(timerEnvioPonteiro)
    timerEnvioPonteiro = null
    ponteiroPendente = null
    telasRemotas.value = new Set()
    ponteiros.value = new Map()
    ponteiroAtivo.value = false
  }

  // --- Chat da chamada ---
  //
  // Um grupo com quem está na chamada, criado só quando alguém envia a
  // primeira mensagem por ele. Quem entra depois passa a fazer parte.

  const conversaChatId = computed(() => chamada.value?.conversa_chat_id ?? null)

  function definirChatChamada(conversaId: number) {
    if (chamada.value && chamada.value.conversa_chat_id !== conversaId) {
      chamada.value = { ...chamada.value, conversa_chat_id: conversaId }
    }
  }

  async function garantirChatChamada(): Promise<number> {
    if (conversaChatId.value) return conversaChatId.value
    if (!chamada.value) throw new Error('Nenhuma chamada em andamento')
    const { conversa_id } = await api.chamadaChat(chamada.value.id)
    definirChatChamada(conversa_id)
    return conversa_id
  }

  // --- Handler de eventos WebSocket ---

  async function tratarEventoChamada(evento: EventoChamadaSocket) {
    const meuUsuarioId = getAuthUserId()
    if (meuUsuarioId === null) return
    const eventoUsuarioId = normalizeUserId(evento.usuario_id)
    // Sinal chega dezenas de vezes por segundo com o ponteiro: fora do log
    if (evento.tipo === TipoEventoSocket.SinalChamada) {
      if (chamada.value?.id === evento.chamada_id && eventoUsuarioId !== null && eventoUsuarioId !== meuUsuarioId && evento.dados) {
        tratarSinal(eventoUsuarioId, evento.dados)
      }
      return
    }
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

        // Ocupado em outra chamada: não chegou a tocar, então é chamada perdida
        if (emChamada.value || estado.value === 'recebendo') {
          try { await api.chamadaRecusar(evento.chamada_id, true) } catch { /* ignore */ }
          return
        }

        try {
          chamada.value = await api.chamadaDados(evento.chamada_id)
          tipoChamada.value = chamada.value.tipo
          estado.value = 'recebendo'

          cancelarTemporizadorToque()
          tempoToqueChamada = window.setTimeout(() => {
            if (estado.value === 'recebendo') {
              void recusarChamada(true)
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
        // Recusada em outra aba ou aparelho: esta para de tocar
        if (chamada.value?.id === evento.chamada_id && eventoUsuarioId === meuUsuarioId && estado.value === 'recebendo') {
          cancelarTemporizadorToque()
          resetarEstado()
          break
        }
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
          // Atendida em outra aba ou aparelho: esta para de tocar
          if (chamada.value?.id === evento.chamada_id && estado.value === 'recebendo' && !atendendoAqui) {
            cancelarTemporizadorToque()
            resetarEstado()
          }
          console.debug('[CALL] Ignorando UsuarioEntrou do próprio usuário')
          break
        }

        if (chamada.value?.id === evento.chamada_id && estado.value === 'chamando') {
          estado.value = 'ativa'
          iniciarTimerDuracao()
        }

        if (chamada.value?.id === evento.chamada_id && estado.value === 'ativa') {
          // Quem acabou de entrar precisa saber que esta tela é compartilhada
          if (compartilhandoTela.value) anunciarTela()
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
          // A transmissao do outro acabou de ser republicada: assina a nova
          // na hora, para voltar a ouvi-lo (e ver, se ja estou em video).
          void trocarAssinatura(eventoUsuarioId!)
          // Ja estou em video: nao ha o que perguntar
          if (tipoChamada.value === TipoChamada.Video) break
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

    const chamadaPendente = pendentes[0]
    if (!chamadaPendente) return
    const idadeMs = Date.now() - new Date(chamadaPendente.criado_em).getTime()

    // Tocou enquanto o app estava fechado: chamada perdida
    if (idadeMs > 25000) {
      try { await api.chamadaRecusar(chamadaPendente.id, true) } catch { /* ignore */ }
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
    participantesAguardando,
    chamarNovamente,
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
    etapaVideo,
    videoAtivadoPor,
    telaUnicaSolicitada,
    responderUpgradeVideo,
    tratarEventoChamada,
    verificarChamadasPendentes,
    encerrarChamada,
    telasRemotas,
    ponteiros,
    ponteiroAtivo,
    alternarPonteiro,
    moverPonteiro,
    conversaChatId,
    garantirChatChamada
  }
})
