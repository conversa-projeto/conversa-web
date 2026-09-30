import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as api from '@/services/conversaApi'
import { dados } from '@/services/eden'
import { ErroNaoAutenticado, getApiBase, getToken, limparToken, setApiBase } from '@/services/http'
import { erro, pedidos, pedidosDe, rota } from './apiFalsa'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('conversa.token', 'token-de-teste')
})
afterEach(() => localStorage.clear())

describe('http', () => {
  test('endereço da API: o salvo, sem barra no fim, ou o da própria página', () => {
    expect(getApiBase()).toBe('https://localhost')
    setApiBase('  https://servidor.test:8443/  ')
    expect(getApiBase()).toBe('https://servidor.test:8443')
  })

  test('token salvo e limpeza', () => {
    expect(getToken()).toBe('token-de-teste')
    limparToken()
    expect(getToken()).toBe('')
  })
})

describe('cliente da API', () => {
  test('manda o token no cabeçalho e o prefixo /api', async () => {
    rota('GET', '/conversas', [])
    await api.getConversas()
    const [pedido] = pedidos
    expect(pedido!.caminho).toBe('/conversas')
    expect(pedido!.cabecalhos.get('authorization')).toBe('Bearer token-de-teste')
  })

  test('sem token, não manda o cabeçalho', async () => {
    localStorage.removeItem('conversa.token')
    rota('GET', '/conversas', [])
    await api.getConversas()
    expect(pedidos[0]!.cabecalhos.get('authorization')).toBeNull()
  })

  test('converte só os campos de data, nunca o texto das mensagens', async () => {
    rota('GET', '/mensagens', [{ id: 1, inserida: '2026-09-01T12:00:00.000Z', visivel_em: null, conteudos: [{ conteudo: '2026-10-05T10:00:00Z' }] }])
    const [mensagem] = await api.getMensagens(1)
    expect(mensagem!.inserida).toBeInstanceOf(Date)
    expect(mensagem!.inserida.toISOString()).toBe('2026-09-01T12:00:00.000Z')
    expect(mensagem!.conteudos[0]!.conteudo).toBe('2026-10-05T10:00:00Z')
  })

  test('401 limpa o token e lança ErroNaoAutenticado', async () => {
    rota('GET', '/conversas', erro(401, 'Token inválido ou expirado'))
    const falha = api.getConversas()
    await expect(falha).rejects.toBeInstanceOf(ErroNaoAutenticado)
    await expect(api.getConversas()).rejects.toThrow('Token inválido ou expirado')
    expect(getToken()).toBe('')
  })

  test('outros erros trazem a mensagem do servidor', async () => {
    rota('PUT', '/mensagem', erro(403, 'Acesso negado!'))
    await expect(api.enviarMensagem(1, [])).rejects.toThrow('Acesso negado!')
  })

  test('erro sem corpo vira "Erro HTTP"', async () => {
    rota('GET', '/conversas', new Response('', { status: 502 }))
    await expect(api.getConversas()).rejects.toThrow('502')
  })

  test('dados(): texto ou message no erro', async () => {
    await expect(dados(Promise.resolve({ data: null, error: { status: 500, value: 'falhou' } }))).rejects.toThrow('falhou')
    await expect(dados(Promise.resolve({ data: null, error: { status: 500, value: { message: 'm' } } }))).rejects.toThrow('m')
    await expect(dados(Promise.resolve({ data: null, error: { status: 418, value: null } }))).rejects.toThrow('Erro HTTP 418')
  })
})

describe('chamadas do conversaApi', () => {
  test('login manda o dispositivo só quando existe', async () => {
    rota('POST', '/login', { id: 1, token: 't' })
    await api.login('ana', 'senha')
    await api.login('ana', 'senha', 7)
    expect(pedidosDe('POST', '/login').map((p) => p.corpo)).toEqual([
      { login: 'ana', senha: 'senha' },
      { login: 'ana', senha: 'senha', dispositivo_id: 7 },
    ])
  })

  test('mensagem com resposta e agendamento', async () => {
    rota('PUT', '/mensagem', { id: 10 })
    const quando = new Date('2026-12-01T10:00:00Z')
    await api.enviarMensagem(3, [{ ordem: 1, tipo: 1, conteudo: 'oi' }], { tipo: 1, origem_mensagem_id: 9 }, quando)
    expect(pedidos[0]!.corpo).toEqual({
      conversa_id: 3,
      conteudos: [{ ordem: 1, tipo: 1, conteudo: 'oi' }],
      mensagem_referencia: { tipo: 1, origem_mensagem_id: 9 },
      visivel_em: '2026-12-01T10:00:00.000Z',
    })
  })

  test('paginação e "novas desde"', async () => {
    rota('GET', '/mensagens', [])
    rota('GET', '/mensagens/novas', [])
    await api.getMensagens(4, 20, 30, 10)
    await api.getMensagensNovas(null)
    await api.getMensagensNovas(new Date('2026-01-01T00:00:00Z'))
    expect(pedidosDe('GET', '/mensagens')[0]!.consulta).toEqual({ conversa: '4', mensagemreferencia: '20', mensagensprevias: '30', mensagensseguintes: '10' })
    expect(pedidosDe('GET', '/mensagens/novas').map((p) => p.consulta.desde)).toEqual(['', '2026-01-01T00:00:00.000Z'])
  })

  test('status de mensagens: lista vazia não chama a API', async () => {
    expect(await api.mensagemStatus(1, [])).toEqual([])
    expect(pedidos).toHaveLength(0)
    rota('GET', '/mensagem/status', [])
    await api.mensagemStatus(1, [5, 6])
    expect(pedidos[0]!.consulta.mensagem).toBe('5,6')
  })

  test('anexos: filtros viram a consulta da API', async () => {
    rota('GET', '/anexos', [])
    await api.getAnexos()
    await api.getAnexos({ conversa: 2, direcao: 'recebidos', tipos: [2, 3], antes: 50, limite: 10, autor: 8 })
    expect(pedidos.map((p) => p.consulta)).toEqual([
      { conversa: '0', autor: '0', direcao: '', tipos: '', antes: '0', limite: '0' },
      { conversa: '2', autor: '8', direcao: 'recebidos', tipos: '2,3', antes: '50', limite: '10' },
    ])
  })

  test('histórico de chamadas com e sem filtro', async () => {
    rota('GET', '/chamadas', [])
    await api.getChamadas()
    await api.getChamadas({ participante: 3, de: '2026-01-01', ate: '2026-02-01' })
    expect(pedidos.map((p) => p.consulta)).toEqual([
      { participante: '0', de: '', ate: '' },
      { participante: '3', de: '2026-01-01', ate: '2026-02-01' },
    ])
  })

  test('SIP: sem ramal a API devolve {}, que vira null', async () => {
    rota('GET', '/sip', {})
    expect(await api.getSip()).toBeNull()
    rota('GET', '/sip', { id: 1, sip_user: '1001' })
    expect(await api.getSip()).toMatchObject({ id: 1 })
  })

  test('endereço do anexo', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/x' })
    expect(await api.getAnexoUrl('abc')).toBe('https://localhost/storage/x')
    expect(pedidos[0]!.consulta).toEqual({ identificador: 'abc' })
  })

  test('chamada: iniciar com e sem conversa', async () => {
    rota('PUT', '/chamada/iniciar', { id: 1 })
    await api.chamadaIniciar(2, [{ id: 1 }, { id: 2 }], 9)
    await api.chamadaIniciar(1, [{ id: 1 }])
    expect(pedidos.map((p) => p.corpo)).toEqual([
      { tipo: 2, usuarios: [{ id: 1 }, { id: 2 }], conversa_id: 9 },
      { tipo: 1, usuarios: [{ id: 1 }] },
    ])
  })

  test('pesquisa sem conversa usa 0', async () => {
    rota('GET', '/pesquisar', [])
    await api.pesquisarMensagens('oi')
    await api.pesquisarMensagens('oi', 5)
    expect(pedidos.map((p) => p.consulta.conversa)).toEqual(['0', '5'])
  })
})
