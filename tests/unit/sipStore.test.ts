import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useSipStore } from '@/stores/sip'
import { erro, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'
import { comportamentoSip, SessionState, sipCriados, TransportState } from './sipFalso'
import { instalarWebrtcFalso } from './webrtcFalso'

const ramal = { id: 1, usuario_id: 7, sip_user: '1001', auth_user: null, sip_password: 'segredo', display_name: 'Ana', domain: 'pbx.teste', ws_server: 'wss://pbx.teste/ws', ativo: true }

let relogio: ReturnType<typeof relogioFalso>

function novaStore(logado = true) {
  if (logado) localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Ana' }))
  setActivePinia(createPinia())
  return useSipStore()
}

async function registrado() {
  rota('GET', '/sip', ramal)
  const sip = novaStore()
  await relogio.rodar(sip.inicializarSessao())
  return sip
}

beforeEach(() => {
  instalarWebrtcFalso()
  relogio = relogioFalso()
})
afterEach(() => relogio.restaurar())

describe('registro do ramal', () => {
  test('com ramal ativo, conecta e registra com os dados cadastrados', async () => {
    const sip = await registrado()
    expect(sip.sipDisponivel).toBe(true)
    expect(sip.isConnected).toBe(true)
    expect(sip.isRegistered).toBe(true)
    expect(sip.erro).toBe('')
    const [agente] = sipCriados.agentes
    expect(agente!.opcoes).toMatchObject({
      uri: 'sip:1001@pbx.teste',
      transportOptions: { server: 'wss://pbx.teste/ws' },
      authorizationUsername: '1001',
      authorizationPassword: 'segredo',
      displayName: 'Ana',
    })
  })

  test('sem ramal ou com ramal inativo, não conecta', async () => {
    rota('GET', '/sip', {})
    const sem = novaStore()
    await sem.inicializarSessao()
    expect(sem.sipDisponivel).toBe(false)
    rota('GET', '/sip', { ...ramal, ativo: false })
    const inativo = novaStore()
    await inativo.inicializarSessao()
    expect(sipCriados.agentes).toHaveLength(0)
  })

  test('registro que não conclui em 10 segundos vira erro', async () => {
    comportamentoSip.registra = false
    rota('GET', '/sip', ramal)
    const sip = novaStore()
    await relogio.rodar(sip.inicializarSessao(), 1000)
    expect(sip.isRegistered).toBe(false)
    expect(sip.erro).toBe('O ramal SIP nao concluiu o registro a tempo.')
  })

  test('endereço SIP inválido vira erro', async () => {
    rota('GET', '/sip', { ...ramal, sip_user: 'com espaço' })
    const sip = novaStore()
    await sip.inicializarSessao()
    expect(sip.erro).toBe('URI SIP inválida.')
  })

  test('queda da conexão é avisada', async () => {
    const sip = await registrado()
    sipCriados.agentes[0]!.transport.stateChange.emitir(TransportState.Disconnected)
    expect(sip.isConnected).toBe(false)
    expect(sip.erro).toBe('Conexao WebSocket perdida.')
    sipCriados.agentes[0]!.transport.onDisconnect!(new Error('code 1006'))
    expect(sip.erro).toBe('Falha na conexao WebSocket: code 1006')
    sip.limparErro()
    expect(sip.erro).toBe('')
  })

  test('sair da conta encerra o ramal', async () => {
    const sip = await registrado()
    localStorage.removeItem('conversa.user')
    const auth = (await import('@/stores/auth')).useAuthStore()
    auth.logout()
    await sip.inicializarSessao()
    expect(sipCriados.agentes[0]!.parado).toBe(true)
    expect(sip.isRegistered).toBe(false)
  })

  test('falha ao buscar o ramal deixa sem ramal', async () => {
    rota('GET', '/sip', erro(500, 'x'))
    const sip = novaStore()
    expect(await sip.carregarConfiguracao()).toBeNull()
    expect(novaStore(false).sipConfig).toBeNull()
  })
})

describe('ligar', () => {
  test('disca, toca enquanto chama e fica em andamento quando atendem', async () => {
    const sip = await registrado()
    await sip.discar('5511999990000')
    const [chamada] = sipCriados.chamadas
    expect(chamada!.destino).toBe('sip:5511999990000@pbx.teste')
    expect(sip.discando).toBe(true)
    expect(sip.chamadaDestinoUri).toBe('sip:5511999990000@pbx.teste')
    chamada!.mudar(SessionState.Established)
    expect(sip.discando).toBe(false)
    expect(sip.chamadaEmAndamento).toBe(true)
  })

  test('destino que não atende: aviso de indisponível', async () => {
    const sip = await registrado()
    await sip.discar('100')
    sipCriados.chamadas[0]!.mudar(SessionState.Terminated)
    expect(sip.erro).toBe('Chamada não completada — destino indisponível ou ocupado.')
    expect(sip.discando).toBe(false)
  })

  test('sem ramal ativo, não disca', async () => {
    rota('GET', '/sip', {})
    const sip = novaStore()
    await sip.inicializarSessao()
    await expect(sip.discar('100')).rejects.toThrow('Ramal SIP inativo.')
  })

  test('convite recusado repassa o erro', async () => {
    const sip = await registrado()
    comportamentoSip.invitaFalha = true
    await expect(sip.discar('100')).rejects.toThrow('invite recusado')
    expect(sip.discando).toBe(false)
  })

  test('desligar: chamando cancela; em andamento, encerra', async () => {
    const sip = await registrado()
    await sip.discar('100')
    await sip.encerrarChamada()
    expect(sipCriados.chamadas[0]!.chamadas).toContain('cancel')
    await sip.discar('200')
    sipCriados.chamadas[1]!.mudar(SessionState.Established)
    await sip.encerrarChamada()
    expect(sipCriados.chamadas[1]!.chamadas).toContain('bye')
    expect(sip.chamadaEmAndamento).toBe(false)
  })

  test('ICE vem do backend a cada chamada, sem credencial fixa no código', async () => {
    const sip = await registrado()
    const opcoes = sipCriados.agentes[0]!.opcoes.sessionDescriptionHandlerFactoryOptions
    await sip.discar('100')
    // Sem servidores no backend, fica o padrão do sip.js
    expect(opcoes.peerConnectionConfiguration).toBeUndefined()
    await sip.encerrarChamada()
    const turn = { urls: 'turns:turn.teste:443', username: 'temporario', credential: 'expira' }
    rota('GET', '/ice', { iceServers: [turn], iceTransportPolicy: 'relay' })
    await sip.discar('200')
    expect(opcoes.peerConnectionConfiguration).toEqual({ iceServers: [turn], iceTransportPolicy: 'relay' })
    rota('GET', '/ice', { iceServers: [{ ...turn, username: 'renovado' }], iceTransportPolicy: 'all' })
    sipCriados.agentes[0]!.receberChamada()
    await sip.aceitarChamada()
    expect(opcoes.peerConnectionConfiguration!.iceServers![0]!.username).toBe('renovado')
  })

  test('mudo e teclas (DTMF) durante a chamada', async () => {
    const sip = await registrado()
    await sip.discar('100')
    const chamada = sipCriados.chamadas[0]!
    sip.enviarDtmf('1')
    expect(chamada.remetente.tons).toEqual([])
    chamada.mudar(SessionState.Established)
    sip.enviarDtmf('5')
    sip.mutar()
    expect(sip.mutado).toBe(true)
    expect(chamada.remetente.track.enabled).toBe(false)
    sip.desmutar()
    expect(chamada.remetente.track.enabled).toBe(true)
    expect(chamada.remetente.tons).toEqual(['5'])
  })
})

describe('receber', () => {
  test('toca, e atender deixa em andamento', async () => {
    const sip = await registrado()
    const convite = sipCriados.agentes[0]!.receberChamada()
    expect(sip.chamadaRecebida).not.toBeNull()
    await sip.aceitarChamada()
    expect(convite.chamadas).toContain('accept')
    expect(sip.chamadaEmAndamento).toBe(true)
    expect(sip.chamadaRecebida).toBeNull()
  })

  test('recusar limpa a chamada', async () => {
    const sip = await registrado()
    const convite = sipCriados.agentes[0]!.receberChamada()
    await sip.recusarChamada()
    expect(convite.chamadas).toContain('reject')
    expect(sip.chamadaRecebida).toBeNull()
  })

  test('quem ligou desistiu: para de tocar', async () => {
    const sip = await registrado()
    const convite = sipCriados.agentes[0]!.receberChamada()
    convite.mudar(SessionState.Terminated)
    expect(sip.chamadaRecebida).toBeNull()
  })
})
