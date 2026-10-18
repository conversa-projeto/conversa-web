import type { SipConfig } from '../types/api'

// STUN público, como no telefone de teste: o navegador descobre o próprio IP
// de fora e o Asterisk (com ICE) manda a mídia direto. O TURN do Conversa não
// serve aqui: ele só repassa até o MediaMTX.
export const STUN_SIP = 'stun:stun.l.google.com:19302'

export type DadosRamal = Pick<SipConfig, 'sip_user' | 'domain' | 'ws_server'> & Partial<Pick<SipConfig, 'auth_user' | 'turn_server' | 'turn_user'>>

// ICE das chamadas SIP: STUN e, com usuário e senha, o TURN do próprio PABX
export function iceDoRamal(config: Pick<SipConfig, 'turn_server' | 'turn_user' | 'turn_password'>): RTCConfiguration {
  const iceServers: RTCIceServer[] = [{ urls: STUN_SIP }]
  if (config.turn_server && config.turn_user && config.turn_password) {
    iceServers.push({ urls: config.turn_server, username: config.turn_user, credential: config.turn_password })
  }
  return { iceServers, iceTransportPolicy: 'all' }
}

// Aceita o número ("*43"), o endereço sem "sip:" ("*43@pbx") ou o endereço
// completo ("sip:*43@pbx"). Sem domínio, vale o do ramal.
export function destinoSip(numero: string, dominio: string) {
  const limpo = numero.trim().replace(/^sips?:/i, '').replace(/\s+/g, '')
  if (!limpo) return ''
  return limpo.includes('@') ? `sip:${limpo}` : `sip:${limpo}@${dominio}`
}

// O mesmo que o servidor confere ao salvar (conferirRamal, em sip.ts da API):
// a tela avisa antes de mandar. Devolve a mensagem do primeiro problema.
export function problemaRamal(ramal: DadosRamal & { sip_password?: string | null }, novo: boolean): string {
  const semEspaco = (valor: string) => valor !== '' && !/[\s@:]/.test(valor)
  if (!semEspaco(ramal.sip_user)) return 'Ramal inválido: informe só o número ou nome do ramal, sem espaços.'
  if (ramal.auth_user && !semEspaco(ramal.auth_user)) return 'Usuário de autenticação inválido.'
  if (novo && !ramal.sip_password) return 'Informe a senha do ramal.'
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(ramal.domain)) return 'Domínio SIP inválido (ex.: voip.empresa.com).'
  if (!/^wss?:\/\/[^\s/]+/i.test(ramal.ws_server)) return 'Servidor WebSocket inválido: deve começar com wss:// (ex.: wss://voip.empresa.com:8089/ws).'
  if (ramal.turn_server && !/^turns?:[^\s]+$/i.test(ramal.turn_server)) return 'Servidor TURN inválido: deve começar com turn: ou turns: (ex.: turns:voip.empresa.com:443).'
  if (ramal.turn_server && !ramal.turn_user) return 'Informe o usuário do TURN.'
  return ''
}
