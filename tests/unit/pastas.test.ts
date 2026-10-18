import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageList from '@/components/MessageList.vue'
import ChatDaPasta from '@/components/ChatDaPasta.vue'
import PainelPastas from '@/components/PainelPastas.vue'
import { useChatStore } from '@/stores/chat'
import { usePastasStore } from '@/stores/pastas'
import { idsNaFaixa } from '@/composables/useSelecaoMensagens'
import { mensagensDoArraste, TIPO_ARRASTE_MENSAGENS } from '@/utils/pastas'
import { TipoConversa, type Mensagem, type PastaMensagens } from '@/types/api'
import { pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'

class ObservadorFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const EU = 7
let tela: VueWrapper | undefined
let chat: ReturnType<typeof useChatStore>
let pastas: ReturnType<typeof usePastasStore>

const focoOriginal = document.hasFocus
const rolagemOriginal = Element.prototype.scrollIntoView
beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
  setActivePinia(createPinia())
  chat = useChatStore()
  pastas = usePastasStore()
  globalThis.ResizeObserver = ObservadorFalso as never
  Element.prototype.scrollIntoView = () => {}
  document.hasFocus = () => true
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.hasFocus = focoOriginal
  Element.prototype.scrollIntoView = rolagemOriginal
  document.body.innerHTML = ''
})

const pasta = (extras: Partial<PastaMensagens> = {}): PastaMensagens =>
  ({ id: 10, conversa_id: 1, dono_id: EU, nome: 'Contratos', cor: '', compartilhada: false, mensagens: 0, ...extras })
const msg = (id: number, extras: Partial<Mensagem> = {}) =>
  mensagem({ id, remetente_id: id % 2 ? 2 : EU, remetente: 'Bruno', conversa_id: 1, inserida: new Date(2026, 9, 1, 12, id), visualizada: true, conteudos: [texto(`m${id}`)], ...extras })

async function abrirConversa(mensagens: Mensagem[], lista: PastaMensagens[], tipo: TipoConversa = TipoConversa.Direta) {
  chat.conversas = [{ id: 1, descricao: 'Bruno', tipo, inserida: new Date(), mensagens_sem_visualizar: 0 }]
  chat.conversaAtivaId = 1
  chat.definirMensagens(1, mensagens)
  rota('GET', '/pastas', lista)
  await pastas.usarConversa(1, tipo === TipoConversa.Direta)
}

describe('seleção pela faixa arrastada', () => {
  test('marca as linhas que a faixa cruza, de cima para baixo ou ao contrário', () => {
    const linhas = [{ id: 1, topo: 0, base: 40 }, { id: 2, topo: 44, base: 80 }, { id: 3, topo: 84, base: 120 }]
    expect(idsNaFaixa(linhas, 50, 90)).toEqual([2, 3])
    expect(idsNaFaixa(linhas, 90, 50)).toEqual([2, 3])
    expect(idsNaFaixa(linhas, 41, 43)).toEqual([])
    expect(idsNaFaixa(linhas, 0, 200)).toEqual([1, 2, 3])
  })

  test('o arraste só aceita ids válidos', () => {
    const evento = { dataTransfer: { getData: (tipo: string) => (tipo === TIPO_ARRASTE_MENSAGENS ? '[3, "x", -1, 8]' : '') } } as unknown as DragEvent
    expect(mensagensDoArraste(evento)).toEqual([3, 8])
  })
})

describe('store das pastas', () => {
  test('só a conversa direta tem pastas', async () => {
    await abrirConversa([], [pasta()], TipoConversa.Grupo)
    expect(pedidosDe('GET', '/pastas')).toHaveLength(0)
    expect(pastas.conversaId).toBeNull()

    await abrirConversa([], [pasta()])
    expect(pedidosDe('GET', '/pastas')[0]!.consulta).toEqual({ conversa: '1' })
    expect(pastas.lista.map((p) => p.nome)).toEqual(['Contratos'])
  })

  test('pôr mensagens na pasta marca as bolhas e relê a lista', async () => {
    await abrirConversa([msg(1), msg(2), msg(3)], [pasta()])
    rota('PUT', '/pasta/mensagens', { pasta_id: 10, incluidas: 2 })
    rota('GET', '/pastas', [pasta({ mensagens: 2 })])
    await pastas.porMensagens(10, [1, 3])
    expect(pedidosDe('PUT', '/pasta/mensagens')[0]!.corpo).toEqual({ pasta_id: 10, mensagens: [1, 3] })
    expect(chat.mensagensAtivas.map((m) => m.pastas ?? [])).toEqual([[10], [], [10]])
    expect(pastas.lista[0]!.mensagens).toBe(2)
  })

  test('pasta que some (excluída ou não mais compartilhada) sai das bolhas e fecha', async () => {
    await abrirConversa([msg(1, { pastas: [10, 11] })], [pasta(), pasta({ id: 11, nome: 'Viagem', dono_id: 2, compartilhada: true })])
    rota('GET', '/pasta/mensagens', [msg(1)])
    await pastas.abrirPasta(11)
    expect(pastas.aberta?.nome).toBe('Viagem')

    rota('GET', '/pastas', [pasta()])
    await pastas.aoAviso({ conversa_id: 1, pasta_id: 11 })
    expect(chat.mensagensAtivas[0]!.pastas).toEqual([10])
    expect(pastas.abertaId).toBeNull()
  })

  test('aviso da outra pessoa marca e tira mensagens; de outra conversa é ignorado', async () => {
    await abrirConversa([msg(1), msg(2)], [pasta({ compartilhada: true })])
    await pastas.aoAviso({ conversa_id: 1, pasta_id: 10, mensagens: [2], acao: 'incluir' })
    expect(chat.mensagensAtivas[1]!.pastas).toEqual([10])
    await pastas.aoAviso({ conversa_id: 1, pasta_id: 10, mensagens: [2], acao: 'tirar' })
    expect(chat.mensagensAtivas[1]!.pastas).toEqual([])
    const lidas = pedidosDe('GET', '/pastas').length
    await pastas.aoAviso({ conversa_id: 99, pasta_id: 10, mensagens: [2], acao: 'incluir' })
    expect(pedidosDe('GET', '/pastas')).toHaveLength(lidas)
  })
})

describe('clique direito na área selecionada', () => {
  test('no vazio da linha selecionada abre o menu da mensagem; fora da seleção, não', async () => {
    await abrirConversa([msg(1), msg(2)], [pasta()])
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()
    const botoes = () => [...document.body.querySelectorAll('button')].map((b) => b.textContent?.trim())

    await tela.find('[data-selecao-id="1"]').trigger('contextmenu', { clientX: 50, clientY: 50 })
    await flushPromises()
    expect(botoes()).not.toContain('Copiar')

    await tela.find('#msg-2 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    const linha = tela.find('[data-selecao-id="2"]')
    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    linha.element.dispatchEvent(evento)
    await flushPromises()
    expect(evento.defaultPrevented).toBe(true)
    expect(botoes()).toContain('Copiar')
  })
})

describe('clique direito com mensagem sem menu na seleção', () => {
  test('na oculta selecionada abre o menu da selecionada mais próxima que tem menu', async () => {
    await abrirConversa([msg(1), msg(2, { excluida_em: new Date() }), msg(3)], [pasta()])
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()
    for (const id of [2, 3]) await tela.find(`#msg-${id} [data-area-mensagem]`).trigger('click', { ctrlKey: true })
    expect(tela.find('#msg-2 [data-area-mensagem]').attributes('data-tem-menu')).toBeUndefined()

    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    tela.find('#msg-2 [data-area-mensagem]').element.dispatchEvent(evento)
    await flushPromises()
    expect(evento.defaultPrevented).toBe(true)
    expect([...document.body.querySelectorAll('button')].map((b) => b.textContent?.trim())).toContain('Copiar')
  })

  test('sem nenhuma selecionada com menu, não abre nada', async () => {
    await abrirConversa([msg(1), msg(2, { excluida_em: new Date() })], [pasta()])
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()
    await tela.find('#msg-2 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    await tela.find('[data-selecao-id="2"]').trigger('contextmenu', { clientX: 50, clientY: 50 })
    await flushPromises()
    expect([...document.body.querySelectorAll('button')].map((b) => b.textContent?.trim())).not.toContain('Copiar')
  })
})

describe('menu fora da pasta', () => {
  test('no chat normal o menu não tem as ações da pasta', async () => {
    await abrirConversa([msg(1, { pastas: [10] })], [pasta()])
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()
    await tela.find('#msg-1 [data-area-mensagem]').trigger('contextmenu', { clientX: 100, clientY: 100 })
    await flushPromises()
    const textos = [...document.body.querySelectorAll('button')].map((b) => b.textContent?.trim())
    expect(textos).toContain('Copiar')
    expect(textos).not.toContain('Tirar da pasta')
  })
})

describe('no chat', () => {
  test('na direta, as pastas da mensagem aparecem marcadas e Ctrl + clique seleciona', async () => {
    await abrirConversa([msg(1, { pastas: [10] }), msg(2)], [pasta({ nome: 'Contratos' })])
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()

    expect(tela.findAll('[data-selecao-id]').map((e) => e.attributes('data-selecao-id'))).toEqual(['1', '2'])
    expect(tela.find('button[title="Pasta Contratos"]').exists()).toBe(true)

    await tela.find('#msg-2 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    expect(pastas.selecionadas).toEqual([2])
    expect(tela.text()).toContain('1 selecionada')

    rota('PUT', '/pasta/mensagens', { pasta_id: 10, incluidas: 1 })
    const botao = tela.findAll('button').find((b) => b.text() === 'Pôr na pasta')!
    await botao.trigger('click')
    const opcao = tela.findAll('button').find((b) => b.text() === 'Contratos')!
    await opcao.trigger('click')
    await flushPromises()
    expect(pedidosDe('PUT', '/pasta/mensagens')[0]!.corpo).toEqual({ pasta_id: 10, mensagens: [2] })
    expect(pastas.selecionadas).toEqual([])
    expect(chat.mensagensAtivas[1]!.pastas).toEqual([10])
  })

  test('no grupo não há seleção nem marcas', async () => {
    await abrirConversa([msg(1, { pastas: [10] })], [], TipoConversa.Grupo)
    tela = mount(MessageList, { attachTo: document.body })
    await flushPromises()
    expect(tela.find('[data-selecao-id]').exists()).toBe(false)
    await tela.find('#msg-1 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    expect(pastas.selecionadas).toEqual([])
  })
})

describe('pasta aberta', () => {
  test('mostra só as mensagens dela, sem campo; pelo menu, tira da pasta e vê na conversa', async () => {
    await abrirConversa([msg(1), msg(2), msg(3)], [pasta({ mensagens: 2 })])
    rota('GET', '/pasta/mensagens', [msg(1, { pastas: [10] }), msg(3, { pastas: [10] })])
    tela = mount(ChatDaPasta, { attachTo: document.body })
    await pastas.abrirPasta(10)
    await flushPromises()

    expect(tela.text()).toContain('Contratos')
    expect(tela.findAll('[id^="msg-"]').map((e) => e.attributes('id'))).toEqual(['msg-1', 'msg-3'])
    expect(tela.find('[contenteditable]').exists()).toBe(false)

    // As ações da pasta ficam no menu do clique direito, não soltas na tela
    expect(tela.find('button[title="Tirar da pasta"]').exists()).toBe(false)
    const itemDoMenu = async (id: number, texto: string) => {
      await tela!.find(`#msg-${id} [data-area-mensagem]`).trigger('contextmenu', { clientX: 100, clientY: 100 })
      await flushPromises()
      return [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === texto)
    }

    rota('DELETE', '/pasta/mensagens', { pasta_id: 10, tiradas: 1 })
    rota('GET', '/pastas', [pasta({ mensagens: 1 })])
    ;(await itemDoMenu(1, 'Tirar da pasta'))!.click()
    await flushPromises()
    expect(pedidosDe('DELETE', '/pasta/mensagens')[0]!.corpo).toEqual({ pasta_id: 10, mensagens: [1] })
    expect(tela.findAll('[id^="msg-"]').map((e) => e.attributes('id'))).toEqual(['msg-3'])

    ;(await itemDoMenu(3, 'Ver na conversa'))!.click()
    await flushPromises()
    expect(tela.emitted('ver-na-conversa')).toEqual([[3]])
    expect(pastas.abertaId).toBeNull()
    expect(tela.html()).toBe('<!--v-if-->')
  })
})

describe('seleção dentro da pasta', () => {
  test('Ctrl + clique marca várias e "Tirar da pasta" tira todas; Esc limpa antes de voltar', async () => {
    await abrirConversa([msg(1), msg(2), msg(3)], [pasta({ mensagens: 3 })])
    rota('GET', '/pasta/mensagens', [msg(1, { pastas: [10] }), msg(2, { pastas: [10] }), msg(3, { pastas: [10] })])
    tela = mount(ChatDaPasta, { attachTo: document.body })
    await pastas.abrirPasta(10)
    await flushPromises()

    await tela.find('#msg-1 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    await tela.find('#msg-3 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    expect(tela.text()).toContain('2 selecionadas')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(tela.text()).not.toContain('selecionadas')
    expect(pastas.abertaId).toBe(10)

    await tela.find('#msg-1 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    await tela.find('#msg-2 [data-area-mensagem]').trigger('click', { ctrlKey: true })
    rota('DELETE', '/pasta/mensagens', { pasta_id: 10, tiradas: 2 })
    rota('GET', '/pastas', [pasta({ mensagens: 1 })])
    await tela.findAll('button').find((b) => b.text() === 'Tirar da pasta')!.trigger('click')
    await flushPromises()
    expect(pedidosDe('DELETE', '/pasta/mensagens')[0]!.corpo).toEqual({ pasta_id: 10, mensagens: [1, 2] })
    expect(tela.findAll('[id^="msg-"]').map((e) => e.attributes('id'))).toEqual(['msg-3'])
    expect(tela.text()).not.toContain('selecionadas')
  })
})

describe('painel', () => {
  test('cria pasta e abre ao clicar; só o dono tem opções', async () => {
    await abrirConversa([], [pasta({ id: 11, nome: 'Da Ana', dono_id: 2, compartilhada: true })])
    tela = mount(PainelPastas, { attachTo: document.body })
    expect(tela.find('button[title="Opções da pasta"]').exists()).toBe(false)

    rota('PUT', '/pasta', pasta({ id: 12, nome: 'Notas' }))
    await tela.find('button[title="Nova pasta"]').trigger('click')
    const campo = tela.find('input[placeholder="Nome da pasta"]')
    await campo.setValue('Notas')
    await tela.find('form').trigger('submit')
    await flushPromises()
    expect(pedidosDe('PUT', '/pasta')[0]!.corpo).toEqual({ conversa_id: 1, nome: 'Notas', cor: '', compartilhada: false })
    expect(pastas.lista.map((p) => p.nome)).toEqual(['Da Ana', 'Notas'])
    expect(tela.findAll('button[title="Opções da pasta"]')).toHaveLength(1)

    rota('GET', '/pasta/mensagens', [])
    await tela.findAll('button').find((b) => b.text().includes('Notas'))!.trigger('click')
    await flushPromises()
    expect(pastas.abertaId).toBe(12)
  })
})
