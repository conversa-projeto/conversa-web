import { describe, expect, test } from 'bun:test'
import { destinoSip, iceDoRamal, problemaRamal, STUN_SIP } from '@/utils/sip'

// O ramal do telefone de teste (sip2.html)
const ramal = { sip_user: '9996', sip_password: 'senha', domain: 'voip.igerp.com', ws_server: 'wss://voip.igerp.com:8089/ws' }

describe('ICE do ramal', () => {
  test('sem TURN, só o STUN (como o teste com TURN vazio)', () => {
    expect(iceDoRamal({})).toEqual({ iceServers: [{ urls: STUN_SIP }], iceTransportPolicy: 'all' })
    expect(STUN_SIP).toBe('stun:stun.l.google.com:19302')
  })

  test('com servidor, usuário e senha, o TURN entra depois do STUN', () => {
    expect(iceDoRamal({ turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc', turn_password: 'x' }).iceServers).toEqual([
      { urls: STUN_SIP },
      { urls: 'turns:voip.igerp.com:443', username: 'webrtc', credential: 'x' },
    ])
  })

  test('TURN incompleto não entra: o navegador recusaria o servidor sem credencial', () => {
    expect(iceDoRamal({ turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc', turn_password: '' }).iceServers).toHaveLength(1)
    expect(iceDoRamal({ turn_server: 'turns:voip.igerp.com:443', turn_user: null, turn_password: 'x' }).iceServers).toHaveLength(1)
    expect(iceDoRamal({ turn_server: null, turn_user: 'webrtc', turn_password: 'x' }).iceServers).toHaveLength(1)
  })
})

describe('destino da ligação', () => {
  test.each([
    ['sip:*43@voip.igerp.com', 'sip:*43@voip.igerp.com'],
    ['*43@voip.igerp.com', 'sip:*43@voip.igerp.com'],
    ['*43', 'sip:*43@voip.igerp.com'],
    [' 8091 ', 'sip:8091@voip.igerp.com'],
    ['SIP:8091@outro.pbx', 'sip:8091@outro.pbx'],
    ['sips:8091@outro.pbx', 'sip:8091@outro.pbx'],
    ['11 9999-0000', 'sip:119999-0000@voip.igerp.com'],
    ['', ''],
    ['   ', ''],
  ])('%p vira %p', (numero, esperado) => {
    expect(destinoSip(numero, 'voip.igerp.com')).toBe(esperado)
  })
})

describe('conferência do ramal antes de salvar', () => {
  test('o ramal do teste passa', () => {
    expect(problemaRamal(ramal, true)).toBe('')
    expect(problemaRamal({ ...ramal, turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc' }, true)).toBe('')
    expect(problemaRamal({ ...ramal, domain: 'voip.igerp.com:5060', ws_server: 'ws://10.0.0.1:8088/ws' }, true)).toBe('')
  })

  test('senha só é obrigatória no ramal novo', () => {
    expect(problemaRamal({ ...ramal, sip_password: '' }, true)).toBe('Informe a senha do ramal.')
    expect(problemaRamal({ ...ramal, sip_password: '' }, false)).toBe('')
  })

  test.each([
    [{ sip_user: '' }, 'Ramal inválido'],
    [{ sip_user: 'sip:9996@voip.igerp.com' }, 'Ramal inválido'],
    [{ sip_user: '99 96' }, 'Ramal inválido'],
    [{ auth_user: 'a b' }, 'Usuário de autenticação inválido.'],
    [{ domain: '' }, 'Domínio SIP inválido'],
    [{ domain: 'voip igerp.com' }, 'Domínio SIP inválido'],
    [{ ws_server: 'voip.igerp.com:8089/ws' }, 'Servidor WebSocket inválido'],
    [{ ws_server: 'https://voip.igerp.com:8089/ws' }, 'Servidor WebSocket inválido'],
    [{ turn_server: 'voip.igerp.com:443', turn_user: 'webrtc' }, 'Servidor TURN inválido'],
    [{ turn_server: 'turns:voip.igerp.com:443' }, 'Informe o usuário do TURN.'],
  ])('%p é recusado', (campos, mensagem) => {
    expect(problemaRamal({ ...ramal, ...campos }, false)).toContain(mensagem)
  })
})
