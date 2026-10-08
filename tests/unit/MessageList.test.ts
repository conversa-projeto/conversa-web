import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageList from '@/components/MessageList.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import BolhaExcluida from '@/components/BolhaExcluida.vue'
import { useChatStore } from '@/stores/chat'
import { TipoConversa, TipoMensagemReferencia, type Mensagem } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'

// O happy-dom não calcula layout: ResizeObserver e rolagem falsos
class ObservadorFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let tela: VueWrapper
let chat: ReturnType<typeof useChatStore>
const EU = 7

const focoOriginal = document.hasFocus
const rolagemOriginal = Element.prototype.scrollIntoView
beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
  setActivePinia(createPinia())
  chat = useChatStore()
  globalThis.ResizeObserver = ObservadorFalso as never
  Element.prototype.scrollIntoView = () => {}
  document.hasFocus = () => true
})
afterEach(() => {
  tela?.unmount()
  document.hasFocus = focoOriginal
  Element.prototype.scrollIntoView = rolagemOriginal
  document.body.innerHTML = ''
})

const dia = (d: number, h = 12) => new Date(2026, 2, d, h, 0)
function msg(id: number, remetente_id: number, inserida: Date, extras: Partial<Mensagem> = {}) {
  return mensagem({ id, remetente_id, remetente: remetente_id === EU ? 'Eu' : 'Bruno', conversa_id: 1, inserida, visualizada: true, conteudos: [texto(`m${id}`)], ...extras })
}

async function abrir(mensagens: Mensagem[], extras: { semVisualizar?: number; tipo?: TipoConversa } = {}) {
  chat.conversas = [{ id: 1, descricao: 'Bruno', tipo: extras.tipo ?? TipoConversa.Direta, inserida: new Date(), mensagens_sem_visualizar: extras.semVisualizar ?? 0 }]
  chat.conversaAtivaId = 1
  chat.definirMensagens(1, mensagens)
  tela = mount(MessageList, { attachTo: document.body })
  await flushPromises()
  return tela
}
const bolhas = () => tela.findAllComponents(MessageBubble)
const textos = () => tela.findAll('#indicador-nao-lidas, .my-3 span, [id^="msg-"]').map((e) => e.attributes('id') === 'indicador-nao-lidas' ? 'Últimas' : (e.attributes('id') || e.text()))

describe('lista de mensagens', () => {
  test('separador por dia e quem mudou de remetente', async () => {
    await abrir([msg(1, 2, dia(1)), msg(2, 2, dia(1, 13)), msg(3, EU, dia(1, 14)), msg(4, EU, dia(2))])
    expect(tela.findAll('.my-3 span')).toHaveLength(2)
    expect(bolhas().map((b) => b.props('mudouRemetente'))).toEqual([false, false, true, false])
    expect(bolhas().map((b) => b.props('isOwn'))).toEqual([false, false, true, true])
    expect(bolhas()[0]!.props('isGroup')).toBe(false)
  })

  test('sem conversa aberta não mostra nada; carregando mostra o aviso', async () => {
    chat.conversaAtivaId = null
    tela = mount(MessageList, { attachTo: document.body })
    expect(tela.html()).toBe('<!--v-if-->')
    tela.unmount()
    chat.conversas = [{ id: 1, descricao: 'x', tipo: TipoConversa.Grupo, inserida: new Date() }]
    chat.conversaAtivaId = 1
    chat.carregando = true
    tela = mount(MessageList, { attachTo: document.body })
    expect(tela.text()).toContain('Carregando mensagens')
  })

  test('avisa quem montou se está no fim do chat', async () => {
    await abrir([msg(1, 2, dia(1))])
    expect(tela.emitted('at-bottom-changed')![0]).toEqual([true])
  })
})

describe('indicador "Últimas"', () => {
  test('ao abrir com não lidas, fica acima da primeira não lida', async () => {
    await abrir([msg(1, 2, dia(1)), msg(2, EU, dia(1)), msg(3, 2, dia(1), { visualizada: false }), msg(4, 2, dia(1), { visualizada: false })], { semVisualizar: 2 })
    await (tela.vm as unknown as { posicionarAberturaConversaAtiva: () => Promise<void> }).posicionarAberturaConversaAtiva()
    await flushPromises()
    expect(textos().slice(1)).toEqual(['msg-1', 'msg-2', 'Últimas', 'msg-3', 'msg-4'])
  })

  test('mensagem nova com a janela sem foco: aparece acima dela, e não se move com as seguintes', async () => {
    await abrir([msg(1, 2, dia(1))])
    document.hasFocus = () => false
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(2, 2, dia(1))])
    await flushPromises()
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(3, 2, dia(1))])
    await flushPromises()
    expect(textos().slice(1)).toEqual(['msg-1', 'Últimas', 'msg-2', 'msg-3'])
  })

  test('depois de perder o foco, a próxima mensagem leva o indicador para ela', async () => {
    await abrir([msg(1, 2, dia(1))])
    document.hasFocus = () => false
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(2, 2, dia(1))])
    await flushPromises()
    window.dispatchEvent(new Event('blur'))
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(3, 2, dia(1))])
    await flushPromises()
    expect(textos().slice(1)).toEqual(['msg-1', 'msg-2', 'Últimas', 'msg-3'])
  })

  test('minha mensagem, ou a dos outros com a janela focada e no fim, não mostra', async () => {
    await abrir([msg(1, 2, dia(1))])
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(2, 2, dia(1))])
    await flushPromises()
    document.hasFocus = () => false
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(3, EU, dia(1))])
    await flushPromises()
    expect(tela.find('#indicador-nao-lidas').exists()).toBe(false)
  })

  test('trocar de conversa limpa o indicador', async () => {
    await abrir([msg(1, 2, dia(1))])
    document.hasFocus = () => false
    chat.definirMensagens(1, [...chat.mensagensAtivas, msg(2, 2, dia(1))])
    await flushPromises()
    expect(tela.find('#indicador-nao-lidas').exists()).toBe(true)
    chat.conversas.push({ id: 2, descricao: 'Outra', tipo: TipoConversa.Direta, inserida: new Date() })
    chat.definirMensagens(2, [msg(2, 2, dia(1), { conversa_id: 2 })])
    chat.conversaAtivaId = 2
    await flushPromises()
    chat.conversaAtivaId = 1
    await flushPromises()
    expect(tela.find('#indicador-nao-lidas').exists()).toBe(false)
  })
})

describe('ações nas mensagens', () => {
  test('responder, encaminhar, abrir imagem e reagir', async () => {
    rota('PUT', '/mensagem/reacao', { mensagem_id: 1, emoji: '👍', acao: 'adicionada' })
    rota('GET', '/mensagens', [])
    await abrir([msg(1, 2, dia(1))])
    const bolha = bolhas()[0]!
    const alvo = chat.mensagensAtivas[0]!
    bolha.vm.$emit('reply', alvo)
    expect(chat.mensagemRespondendo?.id).toBe(1)
    bolha.vm.$emit('forward', alvo)
    bolha.vm.$emit('open-image', 'img', 'a.png')
    expect(tela.emitted('forward')![0]![0]).toMatchObject({ id: 1 })
    expect(tela.emitted('open-image')).toEqual([['img', 'a.png']])
    bolha.vm.$emit('reagir', 1, '👍')
    await aguardar(5)
    expect(pedidosDe('PUT', '/mensagem/reacao')[0]!.corpo).toEqual({ mensagem_id: 1, emoji: '👍' })
  })

  test('responder no privado abre a conversa direta com quem mandou', async () => {
    rota('GET', '/mensagens', [])
    await abrir([msg(1, 2, dia(1))], { tipo: TipoConversa.Grupo })
    chat.conversas.push({ id: 9, descricao: 'Bruno', tipo: TipoConversa.Direta, destinatario_id: 2, inserida: new Date() })
    bolhas()[0]!.vm.$emit('responder-privado', chat.mensagensAtivas[0]!)
    await aguardar(5)
    expect(chat.conversaAtivaId).toBe(9)
    expect(chat.tipoReferenciaPendente).toBe(TipoMensagemReferencia.Encaminhada)
  })

  test('encaminhada de outra conversa abre a outra conversa; resposta rola nesta', async () => {
    await abrir([msg(1, 2, dia(1)), msg(2, 2, dia(1))])
    bolhas()[0]!.vm.$emit('go-to-message', 50, 3)
    expect(tela.emitted('open-message')).toEqual([[3, 50]])
    bolhas()[0]!.vm.$emit('go-to-message', 2, 1)
    expect(tela.emitted('open-message')).toHaveLength(1)
  })

  // Diálogo do app (DialogoConfirmacao), aberto no body
  const dialogoAberto = () => document.querySelector('[role="alertdialog"]')
  async function responder(textoBotao: string) {
    ;[...dialogoAberto()!.querySelectorAll('button')].find((b) => b.textContent!.trim() === textoBotao)!.click()
    await aguardar(10)
  }

  test('excluir pede confirmação na janela do app e mostra erro do servidor', async () => {
    rota('DELETE', '/mensagem', {})
    await abrir([msg(1, EU, dia(1))])
    bolhas()[0]!.vm.$emit('excluir', chat.mensagensAtivas[0]!)
    await aguardar(5)
    expect(dialogoAberto()!.textContent).toContain('Ela continua na conversa, marcada como oculta.')
    await responder('Cancelar')
    expect(pedidosDe('DELETE', '/mensagem')).toHaveLength(0)
    rota('DELETE', '/mensagem', erro(403, 'Só o autor exclui'))
    bolhas()[0]!.vm.$emit('excluir', chat.mensagensAtivas[0]!)
    await aguardar(5)
    await responder('Ocultar')
    expect(dialogoAberto()!.textContent).toContain('Não foi possível ocultar')
    expect(dialogoAberto()!.textContent).toContain('Só o autor exclui')
    expect([...dialogoAberto()!.querySelectorAll('button')].map((b) => b.textContent!.trim())).toEqual(['OK'])
    await responder('OK')
    expect(dialogoAberto()).toBeNull()
  })

  test('excluída continua na lista, como excluída; a agendada que não saiu nem aparece no chat', async () => {
    const excluidaEm = new Date().toISOString()
    rota('DELETE', '/mensagem', (pedido: { consulta: { id: string } }) => pedido.consulta.id === '1'
      ? { id: 1, conversa_id: 1, excluida_em: excluidaEm }
      : { id: 2, conteudo: {} })
    // Depois de excluir, a lista de conversas é recarregada (prévia "Mensagem oculta")
    rota('GET', '/conversas', [{ id: 1, descricao: 'Bruno', tipo: TipoConversa.Direta, inserida: new Date().toISOString() }])
    const futura = new Date(Date.now() + 3600_000)
    await abrir([msg(1, EU, dia(1)), msg(2, EU, dia(1), { visivel_em: futura })])
    expect(bolhas()).toHaveLength(1)
    bolhas()[0]!.vm.$emit('excluir', chat.mensagensAtivas[0]!)
    await aguardar(5)
    await responder('Ocultar')
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([1, 2])
    expect(chat.mensagensAtivas[0]!.excluida_em).toEqual(new Date(excluidaEm))
    expect(tela.findComponent(BolhaExcluida).exists()).toBe(true)
    expect(pedidosDe('GET', '/conversas')).toHaveLength(1)
    expect(bolhas()).toHaveLength(1)
  })

  test('baixar anexo indisponível avisa o erro', async () => {
    rota('GET', '/anexo', erro(404, 'Anexo não encontrado'))
    await abrir([msg(1, 2, dia(1))])
    bolhas()[0]!.vm.$emit('download', 'sumiu', 'a.txt')
    await aguardar(10)
    expect(dialogoAberto()!.textContent).toContain('Não foi possível baixar')
    expect(dialogoAberto()!.textContent).toContain('Anexo não encontrado')
  })

  test('baixar um anexo salva com o nome do arquivo', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/arq-1' })
    rota('GET', '/storage/arq-1', new Response('conteúdo'))
    const baixados: string[] = []
    const clicarOriginal = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { baixados.push(this.download) }
    try {
      await abrir([msg(1, 2, dia(1))])
      bolhas()[0]!.vm.$emit('download', 'arq-1', 'a.txt')
      await aguardar(10)
      expect(baixados).toEqual(['a.txt'])
    } finally {
      HTMLAnchorElement.prototype.click = clicarOriginal
    }
  })
})

describe('rolagem', () => {
  test('campo de mensagem que cresce rola a lista junto', async () => {
    await abrir([msg(1, 2, dia(1))])
    const container = tela.find('.overflow-y-auto').element as HTMLElement
    container.scrollTop = 100
    await tela.setProps({ alturaCampoMensagem: 40 })
    await flushPromises()
    expect(container.scrollTop).toBe(140)
  })

  test('rolar avisa a âncora 200 ms depois de parar', async () => {
    const relogio = relogioFalso()
    try {
      await abrir([msg(1, 2, dia(1))])
      const container = tela.find('.overflow-y-auto')
      await container.trigger('scroll')
      relogio.avancar(100)
      await container.trigger('scroll')
      relogio.avancar(199)
      expect(tela.emitted('ancora-changed')).toBeUndefined()
      relogio.avancar(1)
      expect(tela.emitted('ancora-changed')).toHaveLength(1)
    } finally {
      relogio.restaurar()
    }
  })
})
