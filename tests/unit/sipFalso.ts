// sip.js falso: não há servidor SIP nos testes. O agente e o registro respondem
// como o teste mandar, e cada chamada muda de estado quando o teste quiser.

class Emissor<T> {
  private ouvintes: ((valor: T) => void)[] = []
  addListener(ouvinte: (valor: T) => void) { this.ouvintes.push(ouvinte) }
  emitir(valor: T) { this.ouvintes.forEach((o) => o(valor)) }
}

export const SessionState = { Initial: 'Initial', Establishing: 'Establishing', Established: 'Established', Terminating: 'Terminating', Terminated: 'Terminated' } as const
export const RegistererState = { Initial: 'Initial', Registered: 'Registered', Unregistered: 'Unregistered', Terminated: 'Terminated' } as const
export const TransportState = { Connecting: 'Connecting', Connected: 'Connected', Disconnecting: 'Disconnecting', Disconnected: 'Disconnected' } as const
export const UserAgentState = { Started: 'Started', Stopped: 'Stopped' } as const

// Como o próximo registro responde
export const comportamentoSip = { registra: true, invitaFalha: false }
export const sipCriados: { agentes: UserAgentFalso[]; chamadas: SessaoFalsa[] } = { agentes: [], chamadas: [] }

export class RemetenteFalso {
  track = { kind: 'audio', enabled: true }
  tons: string[] = []
  dtmf = { insertDTMF: (tons: string) => void this.tons.push(tons) }
}

export class SessaoFalsa {
  state: string = SessionState.Initial
  stateChange = new Emissor<string>()
  remetente = new RemetenteFalso()
  sessionDescriptionHandler = {
    peerConnection: { ontrack: null, getReceivers: () => [], getSenders: () => [this.remetente] },
  }
  chamadas: string[] = []
  constructor(public destino?: string) {}
  mudar(estado: string) {
    this.state = estado
    this.stateChange.emitir(estado)
  }
  async invite() {
    this.chamadas.push('invite')
    if (comportamentoSip.invitaFalha) throw new Error('invite recusado')
    this.mudar(SessionState.Establishing)
  }
  async cancel() { this.chamadas.push('cancel'); this.mudar(SessionState.Terminated) }
  async bye() { this.chamadas.push('bye'); this.mudar(SessionState.Terminated) }
  async accept() { this.chamadas.push('accept'); this.mudar(SessionState.Established) }
  async reject() { this.chamadas.push('reject'); this.mudar(SessionState.Terminated) }
}

export class UserAgentFalso {
  stateChange = new Emissor<string>()
  transport = { stateChange: new Emissor<string>(), onDisconnect: null as ((e?: Error) => void) | null }
  parado = false
  constructor(public opcoes: { uri: string; transportOptions: { server: string }; authorizationUsername: string; authorizationPassword: string; displayName: string; sessionDescriptionHandlerFactoryOptions: { peerConnectionConfiguration?: RTCConfiguration }; delegate: { onInvite: (i: SessaoFalsa) => void } }) {
    sipCriados.agentes.push(this)
  }
  static makeURI(uri: string) { return uri.includes('@') && !uri.includes(' ') ? uri : undefined }
  async start() { this.transport.stateChange.emitir(TransportState.Connected) }
  async stop() {
    this.parado = true
    this.stateChange.emitir(UserAgentState.Stopped)
  }
  // O teste simula uma chamada chegando
  receberChamada() {
    const convite = new SessaoFalsa()
    this.opcoes.delegate.onInvite(convite)
    return convite
  }
}

export class RegistererFalso {
  stateChange = new Emissor<string>()
  constructor(public agente: UserAgentFalso) {}
  async register() {
    if (comportamentoSip.registra) this.stateChange.emitir(RegistererState.Registered)
  }
  async unregister() { this.stateChange.emitir(RegistererState.Unregistered) }
}

export class InviterFalso extends SessaoFalsa {
  constructor(_agente: UserAgentFalso, destino: string) {
    super(destino)
    sipCriados.chamadas.push(this)
  }
}

export function limparSipFalso() {
  comportamentoSip.registra = true
  comportamentoSip.invitaFalha = false
  sipCriados.agentes.length = 0
  sipCriados.chamadas.length = 0
}

export const moduloSipFalso = {
  UserAgent: UserAgentFalso,
  Registerer: RegistererFalso,
  Inviter: InviterFalso,
  SessionState,
  RegistererState,
  TransportState,
  UserAgentState,
}
