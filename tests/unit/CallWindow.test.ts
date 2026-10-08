import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CallWindow from '@/CallWindow.vue'
import { useCallStore, type PeerConexao } from '@/stores/call'
import { TipoChamada } from '@/types/api'
import { instalarWebrtcFalso, MidiaFalsa, TrilhaFalsa } from './webrtcFalso'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { useChatStore } from '@/stores/chat'
import MessageList from '@/components/MessageList.vue'
import MessageInput from '@/components/MessageInput.vue'

const ANA = 2
const BRUNO = 3

function participante(usuarioId: number, usuarioNome: string): PeerConexao {
  return { usuarioId, usuarioNome, txPc: null, rxPc: null, stream: null }
}

let janela: VueWrapper
let call: ReturnType<typeof useCallStore>

function emChamadaDeVideo(peers: PeerConexao[] = []) {
  call.estado = 'ativa'
  call.tipoChamada = TipoChamada.Video
  call.chamada = { id: 1, tipo: 2, status: 3, iniciada: null, finalizada: null, criado_em: new Date(), criado_por: ANA, usuarios: [] } as never
  call.peers = new Map(peers.map((p) => [p.usuarioId, p]))
}

// Modo ativo pelo botão destacado no cabeçalho
function modoAtivo() {
  const ativo = janela.findAll('button[title]').find((b) => b.classes().includes('bg-chamada-500'))
  return ({ 'Todos os participantes lado a lado': 'grade', 'Um participante grande e os demais na lateral': 'destaque', 'Só um participante, ocupando toda a área': 'unica' } as Record<string, string>)[ativo?.attributes('title') ?? '']
}

async function montar(peers: PeerConexao[] = [], fecharAoEncerrar = false) {
  emChamadaDeVideo(peers)
  janela = mount(CallWindow, { props: { fecharAoEncerrar }, attachTo: document.body })
  await flushPromises()
}

beforeEach(() => {
  instalarWebrtcFalso()
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
  call = useCallStore()
})
afterEach(() => janela?.unmount())

describe('modo de exibição da chamada', () => {
  test('começa em grade, e o cabeçalho mostra quantas pessoas', async () => {
    await montar([participante(ANA, 'Ana')])
    expect(modoAtivo()).toBe('grade')
    expect(janela.text()).toContain('2 pessoas')
  })

  test('pedido de tela única aplica no participante pedido e é consumido', async () => {
    await montar([participante(ANA, 'Ana'), participante(BRUNO, 'Bruno')])
    call.telaUnicaSolicitada = BRUNO
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
    expect(call.telaUnicaSolicitada).toBeNull()
    expect(janela.text()).toContain('Bruno')
  })

  test('sem ninguém conectado ainda, o pedido espera o primeiro chegar', async () => {
    await montar([])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
    expect(call.telaUnicaSolicitada).toBe(ANA)
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('pedido feito antes de a janela abrir vale ao abrir', async () => {
    call.telaUnicaSolicitada = ANA
    await montar([participante(ANA, 'Ana')])
    expect(modoAtivo()).toBe('unica')
  })

  test('participante pedido fora da chamada: usa o primeiro que estiver', async () => {
    await montar([participante(BRUNO, 'Bruno')])
    call.telaUnicaSolicitada = 0
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('a conexão cai e volta logo depois de atender: a tela única se mantém', async () => {
    await montar([participante(ANA, 'Ana')])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    call.peers = new Map()
    await flushPromises()
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('escolher outro modo na mão cancela o pedido pendente', async () => {
    await montar([participante(ANA, 'Ana')])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    call.peers = new Map()
    await flushPromises()
    await janela.find('button[title="Todos os participantes lado a lado"]').trigger('click')
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
    expect(call.telaUnicaSolicitada).toBeNull()
  })

  test('trocar de modo pelos botões', async () => {
    await montar([participante(ANA, 'Ana')])
    await janela.find('button[title="Um participante grande e os demais na lateral"]').trigger('click')
    expect(modoAtivo()).toBe('destaque')
    await janela.find('button[title="Só um participante, ocupando toda a área"]').trigger('click')
    expect(modoAtivo()).toBe('unica')
    await janela.find('button[title="Todos os participantes lado a lado"]').trigger('click')
    expect(modoAtivo()).toBe('grade')
  })

  test('em destaque, se o participante em foco sai de vez, volta para a grade', async () => {
    await montar([participante(ANA, 'Ana'), participante(BRUNO, 'Bruno')])
    await janela.find('button[title="Um participante grande e os demais na lateral"]').trigger('click')
    call.peers = new Map([[BRUNO, participante(BRUNO, 'Bruno')]])
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
  })

  test('chamada de áudio não mostra os modos', async () => {
    await montar([participante(ANA, 'Ana')])
    call.tipoChamada = TipoChamada.Audio
    await flushPromises()
    expect(modoAtivo()).toBeUndefined()
  })
})

describe('ponteiro na tela compartilhada', () => {
  // O happy-dom só aceita no srcObject o MediaStream dele, não o falso
  const srcObjectOriginal = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject')!
  const playOriginal = HTMLMediaElement.prototype.play
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', { configurable: true, get: () => null, set: () => {} })
    HTMLMediaElement.prototype.play = () => Promise.resolve()
  })
  afterEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', srcObjectOriginal)
    HTMLMediaElement.prototype.play = playOriginal
  })

  function comVideo(peer: PeerConexao) {
    peer.stream = new MidiaFalsa([new TrilhaFalsa('video')]) as never
    return peer
  }

  test('o botão aparece só com tela de outro, e com ele ligado o mouse sobre a tela envia a posição', async () => {
    await montar([comVideo(participante(ANA, 'Ana'))])
    expect(janela.find('button[title="Apontar na tela compartilhada"]').exists()).toBe(false)
    call.telasRemotas = new Set([ANA])
    await flushPromises()
    await janela.find('button[title="Apontar na tela compartilhada"]').trigger('click')
    expect(call.ponteiroAtivo).toBe(true)

    const enviados: unknown[] = []
    call.moverPonteiro = (alvo, x, y) => { enviados.push({ alvo, x, y }) }
    const video = janela.findAll('video').at(-1)!
    Object.defineProperties(video.element, { videoWidth: { value: 200 }, videoHeight: { value: 100 } })
    const sobre = video.element.parentElement!.querySelector('.cursor-crosshair') as HTMLElement
    sobre.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} })
    sobre.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 75 }))
    sobre.dispatchEvent(new PointerEvent('pointerleave'))
    expect(enviados).toEqual([{ alvo: ANA, x: 0.25, y: 0.75 }, { alvo: ANA, x: null, y: null }])
  })

  test('desenha o ponteiro de outro com o nome sobre a tela que eu compartilho', async () => {
    call.compartilhandoTela = true
    call.streamLocal = new MidiaFalsa([new TrilhaFalsa('video')]) as never
    await montar([participante(ANA, 'Ana')])
    call.ponteiros = new Map([[ANA, { usuarioId: ANA, nome: 'Ana', alvo: 7, x: 0.5, y: 0.5 }]])
    await flushPromises()
    expect(janela.text()).toContain('Ana')
    expect(janela.find('.cursor-crosshair').exists()).toBe(false)
  })
})

describe('chat da chamada', () => {
  const mensagem = (id: number, remetente_id: number, remetente: string, texto: string) => ({
    id, remetente_id, remetente, conversa_id: 40, inserida: new Date().toISOString(), alterada: null, visivel_em: null,
    recebida: true, visualizada: remetente_id === 7, reproduzida: false, conteudos: [{ ordem: 1, tipo: 1, conteudo: texto }],
  })

  // Na janela popup da chamada o painel é o simples
  test('popup: a primeira mensagem cria o grupo, envia e mostra a conversa', async () => {
    await montar([participante(ANA, 'Ana')], true)
    await janela.find('button[title="Chat da chamada"]').trigger('click')
    expect(janela.text()).toContain('ficam num grupo com quem está na chamada')
    expect(pedidosDe('GET', '/mensagens')).toHaveLength(0)

    rota('PUT', '/chamada/chat', { conversa_id: 40 })
    rota('PUT', '/mensagem', { id: 1, conversa_id: 40, usuario_id: 7 })
    rota('GET', '/mensagens', [mensagem(1, 7, 'Eu', 'olá'), mensagem(2, ANA, 'Ana', 'oi!')])
    rota('POST', '/mensagem/visualizar', { sucesso: true })
    rota('GET', '/conversas', [])
    await janela.find('textarea').setValue('olá')
    await janela.find('form').trigger('submit')
    await aguardar(20)

    expect(pedidosDe('PUT', '/chamada/chat')[0]!.corpo).toEqual({ id: 1 })
    expect(pedidosDe('PUT', '/mensagem')[0]!.corpo).toMatchObject({ conversa_id: 40, conteudos: [{ ordem: 1, tipo: 1, conteudo: 'olá' }] })
    expect(janela.text()).toContain('oi!')
    expect(janela.text()).toContain('Ana')
    expect((janela.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    // A mensagem de Ana, vista com o painel aberto, é marcada como visualizada
    expect(pedidosDe('POST', '/mensagem/visualizar').map((p) => p.corpo)).toEqual([{ conversa: 40, mensagem: 2 }])
  })

  test('janela principal: abre o chat completo da conversa do grupo e, ao fechar, volta à conversa anterior', async () => {
    const rolagemOriginal = Element.prototype.scrollIntoView
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
    Element.prototype.scrollIntoView = () => {}
    rota('GET', '/mensagens', [mensagem(2, ANA, 'Ana', 'oi!')])
    rota('GET', '/conversas', [])
    rota('POST', '/mensagem/visualizar', { sucesso: true })
    rota('GET', '/conversa/usuarios', [])
    await montar([participante(ANA, 'Ana')])
    call.chamada = { ...call.chamada!, conversa_chat_id: 40 }
    const chat = useChatStore()
    chat.conversas = [
      { id: 5, descricao: 'Outra', tipo: 2, inserida: new Date() },
      { id: 40, descricao: 'Chamada: Ana, Eu', tipo: 2, inserida: new Date() },
    ]
    chat.conversaAtivaId = 5

    await janela.find('button[title="Chat da chamada"]').trigger('click')
    await aguardar(20)
    expect(chat.conversaAtivaId).toBe(40)
    expect(janela.findComponent(MessageList).exists()).toBe(true)
    expect(janela.findComponent(MessageInput).exists()).toBe(true)
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([2])

    await janela.find('button[title="Fechar chat"]').trigger('click')
    await aguardar(20)
    expect(chat.conversaAtivaId).toBe(5)
    Element.prototype.scrollIntoView = rolagemOriginal
  })

  test('janela principal sem grupo ainda: o clique no campo cria o grupo e abre o chat completo', async () => {
    const rolagemOriginal = Element.prototype.scrollIntoView
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
    Element.prototype.scrollIntoView = () => {}
    rota('PUT', '/chamada/chat', { conversa_id: 40 })
    rota('GET', '/conversas', [{ id: 40, descricao: 'Chamada: Ana, Eu', tipo: 2, inserida: new Date().toISOString() }])
    rota('GET', '/mensagens', [])
    rota('GET', '/conversa/usuarios', [])
    await montar([participante(ANA, 'Ana')])
    const chat = useChatStore()
    await janela.find('button[title="Chat da chamada"]').trigger('click')
    expect(janela.text()).toContain('ficam num grupo com quem está na chamada')
    expect(janela.find('textarea').exists()).toBe(false)
    expect(pedidosDe('PUT', '/chamada/chat')).toHaveLength(0)

    await janela.findAll('button').find((b) => b.text() === 'Digite uma mensagem')!.trigger('click')
    await aguardar(20)
    expect(pedidosDe('PUT', '/chamada/chat')).toHaveLength(1)
    expect(chat.conversaAtivaId).toBe(40)
    expect(janela.findComponent(MessageList).exists()).toBe(true)
    expect(janela.findComponent(MessageInput).exists()).toBe(true)
    Element.prototype.scrollIntoView = rolagemOriginal
  })

  test('com o painel fechado, o botão mostra as não lidas do grupo', async () => {
    await montar([participante(ANA, 'Ana')])
    call.chamada = { ...call.chamada!, conversa_chat_id: 40 }
    useChatStore().conversas = [{ id: 40, descricao: 'Chamada: Ana, Eu', tipo: 2, inserida: new Date(), mensagens_sem_visualizar: 3 }]
    await flushPromises()
    expect(janela.find('button[title="Chat da chamada"]').element.parentElement!.textContent).toContain('3')
  })
})

describe('chave de liga/desliga', () => {
  const botao = (titulo: string) => janela.find(`button[title="${titulo}"]`)
  const chave = (titulo: string) => botao(titulo).find('[data-chave]')

  test('microfone: a chave fica verde ligada e cinza desligada', async () => {
    await montar([participante(ANA, 'Ana')])
    expect(botao('Microfone').attributes('role')).toBe('switch')
    expect(botao('Microfone').attributes('aria-checked')).toBe('true')
    expect(chave('Microfone').classes()).toContain('bg-success-500')
    call.micMutado = true
    await flushPromises()
    expect(botao('Microfone').attributes('aria-checked')).toBe('false')
    expect(chave('Microfone').classes()).toContain('bg-chamada-500')
  })

  test('compartilhar tela tem chave; ações não', async () => {
    await montar([participante(ANA, 'Ana')])
    expect(chave('Compartilhar tela').classes()).toContain('bg-chamada-500')
    call.compartilhandoTela = true
    await flushPromises()
    expect(chave('Compartilhar tela').classes()).toContain('bg-success-500')
    expect(botao('Minimizar').find('[data-chave]').exists()).toBe(false)
    expect(botao('Minimizar').attributes('role')).toBeUndefined()
  })
})
