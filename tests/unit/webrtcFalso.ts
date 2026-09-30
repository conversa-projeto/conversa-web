// WebRTC falso: o happy-dom não tem câmera, microfone nem RTCPeerConnection.
// O teste escolhe quais aparelhos existem; a conexão entrega as trilhas remotas
// quando recebe a resposta (SDP) do MediaMTX, que vem da API falsa.

export class TrilhaFalsa {
  enabled = true
  muted = false
  readyState: 'live' | 'ended' = 'live'
  contentHint = ''
  onended: (() => void) | null = null
  onmute: (() => void) | null = null
  onunmute: (() => void) | null = null
  constructor(public kind: 'audio' | 'video', public label: string = kind) {}
  stop() { this.readyState = 'ended' }
  applyConstraints() { return Promise.resolve() }
}

export class MidiaFalsa {
  private trilhas: TrilhaFalsa[]
  constructor(trilhas: TrilhaFalsa[] = []) { this.trilhas = [...trilhas] }
  getTracks() { return [...this.trilhas] }
  getAudioTracks() { return this.trilhas.filter((t) => t.kind === 'audio') }
  getVideoTracks() { return this.trilhas.filter((t) => t.kind === 'video') }
  addTrack(t: TrilhaFalsa) { this.trilhas.push(t) }
  removeTrack(t: TrilhaFalsa) { this.trilhas = this.trilhas.filter((x) => x !== t) }
}

// Aparelhos disponíveis neste navegador falso
export const aparelhos = { camera: true, microfone: true, tela: true, telaComAudio: false }
export const pedidosMidia: MediaStreamConstraints[] = []

function obterMidia(pedido: MediaStreamConstraints) {
  pedidosMidia.push(pedido)
  if ((pedido.video && !aparelhos.camera) || (pedido.audio && !aparelhos.microfone)) {
    return Promise.reject(new DOMException('Requested device not found', 'NotFoundError'))
  }
  const trilhas: TrilhaFalsa[] = []
  if (pedido.audio) trilhas.push(new TrilhaFalsa('audio', 'microfone'))
  if (pedido.video) trilhas.push(new TrilhaFalsa('video', 'camera'))
  return Promise.resolve(new MidiaFalsa(trilhas))
}

function obterTela() {
  if (!aparelhos.tela) return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
  const trilhas = [new TrilhaFalsa('video', 'tela')]
  if (aparelhos.telaComAudio) trilhas.push(new TrilhaFalsa('audio', 'som-da-tela'))
  return Promise.resolve(new MidiaFalsa(trilhas))
}

export const conexoes: ConexaoFalsa[] = []

class TransceiverFalso {
  direction: string
  enviando: TrilhaFalsa | null
  parametros: { encodings: Record<string, unknown>[]; degradationPreference?: string } = { encodings: [{}] }
  receiver: { track: { kind: string } }
  sender: {
    track: TrilhaFalsa | null
    getParameters: () => TransceiverFalso['parametros']
    setParameters: (p: TransceiverFalso['parametros']) => Promise<void>
    replaceTrack: (t: TrilhaFalsa | null) => Promise<void>
  }
  constructor(kind: string, trilha: TrilhaFalsa | null, direction = 'sendrecv') {
    this.direction = direction
    this.enviando = trilha
    this.receiver = { track: { kind } }
    this.sender = {
      track: trilha,
      getParameters: () => this.parametros,
      setParameters: async (p) => void (this.parametros = p),
      replaceTrack: async (t) => void (this.sender.track = t),
    }
  }
}

export class ConexaoFalsa {
  connectionState = 'new'
  iceConnectionState = 'new'
  iceGatheringState = 'complete'
  localDescription: { type: string; sdp: string } | null = null
  remoteDescription: { type: string; sdp: string } | null = null
  transceivers: TransceiverFalso[] = []
  fechada = false
  ontrack: ((e: { track: TrilhaFalsa }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onicegatheringstatechange: (() => void) | null = null

  constructor(public config: unknown) {
    conexoes.push(this)
  }

  addTrack(trilha: TrilhaFalsa) { this.transceivers.push(new TransceiverFalso(trilha.kind, trilha)) }
  addTransceiver(kind: string, opcoes: { direction: string }) { this.transceivers.push(new TransceiverFalso(kind, null, opcoes.direction)) }
  getTransceivers() { return this.transceivers }
  async createOffer() {
    return { type: 'offer', sdp: this.transceivers.map((t) => `m=${t.receiver.track.kind}\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10`).join('\r\n') }
  }
  async setLocalDescription(d: { type: string; sdp: string }) { this.localDescription = d }
  async setRemoteDescription(d: { type: string; sdp: string }) {
    this.remoteDescription = d
    this.connectionState = 'connected'
    // Assinatura (só recebe): entrega as trilhas que a resposta anuncia
    if (this.transceivers.every((t) => t.direction === 'recvonly')) {
      if (d.sdp.includes('m=audio')) this.ontrack?.({ track: new TrilhaFalsa('audio', 'remoto') })
      if (d.sdp.includes('m=video')) this.ontrack?.({ track: new TrilhaFalsa('video', 'remoto') })
    }
  }
  close() {
    this.fechada = true
    this.connectionState = 'closed'
  }
  // O teste simula a conexão caindo
  mudarEstado(estado: string) {
    this.connectionState = estado
    this.onconnectionstatechange?.()
  }
}

// Elemento de áudio como o do navegador: play() devolve uma promessa
export const audiosTocando: AudioFalso[] = []
class AudioFalso {
  autoplay = false
  muted = false
  srcObject: unknown = null
  pausado = true
  setAttribute() {}
  play() {
    this.pausado = false
    audiosTocando.push(this)
    return Promise.resolve()
  }
  pause() { this.pausado = true }
}

class ContextoAudioFalso {
  createMediaStreamDestination() { return { stream: new MidiaFalsa([new TrilhaFalsa('audio', 'mistura')]) } }
  createMediaStreamSource() { return { connect: () => {} } }
  close() { return Promise.resolve() }
}

export function instalarWebrtcFalso() {
  aparelhos.camera = true
  aparelhos.microfone = true
  aparelhos.tela = true
  aparelhos.telaComAudio = false
  pedidosMidia.length = 0
  conexoes.length = 0
  audiosTocando.length = 0
  Object.assign(globalThis, { MediaStream: MidiaFalsa, RTCPeerConnection: ConexaoFalsa, AudioContext: ContextoAudioFalso, Audio: AudioFalso })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: obterMidia, getDisplayMedia: obterTela },
    configurable: true,
  })
}
