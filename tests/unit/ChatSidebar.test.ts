import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatSidebar from '@/components/ChatSidebar.vue'
import { useChatStore } from '@/stores/chat'
import { TipoConversa, type Conversa } from '@/types/api'
import { pedidosDe, rota } from './apiFalsa'

function conversa(id: number, extras: Partial<Conversa> = {}): Conversa {
  return { id, descricao: `Conversa ${id}`, tipo: TipoConversa.Direta, inserida: new Date(), mensagem_id: id, fixada_ordem: null, arquivada_em: null, ...extras }
}

let barra: VueWrapper
let chat: ReturnType<typeof useChatStore>

async function montar(conversas: Conversa[]) {
  chat.conversas = conversas
  barra = mount(ChatSidebar, { props: { sidebarAberta: true }, attachTo: document.body })
  await flushPromises()
}

// Títulos na ordem da lista; o cabeçalho das arquivadas aparece como "[Arquivadas (n)]"
function ordem() {
  const lista = barra.find('.overflow-auto')
  return lista.element.children.length
    ? Array.from(lista.element.querySelectorAll(':scope > [role="button"], :scope > button')).map((e) =>
        e.getAttribute('role') === 'button' ? e.querySelector('span.truncate')!.textContent!.trim() : `[${e.textContent!.trim()}]`)
    : []
}

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
  chat = useChatStore()
})
const medirOriginal = HTMLElement.prototype.getBoundingClientRect
afterEach(() => {
  barra?.unmount()
  HTMLElement.prototype.getBoundingClientRect = medirOriginal
})

describe('lista de conversas', () => {
  test('fixadas primeiro, na ordem escolhida; depois as mais recentes', async () => {
    await montar([conversa(1), conversa(2, { fixada_ordem: 2 }), conversa(3), conversa(4, { fixada_ordem: 1 })])
    expect(ordem()).toEqual(['Conversa 4', 'Conversa 2', 'Conversa 3', 'Conversa 1'])
  })

  test('arquivadas ficam no fim, recolhidas, e abrem ao clicar no agrupador', async () => {
    await montar([conversa(1), conversa(2, { arquivada_em: new Date() }), conversa(3, { arquivada_em: new Date() })])
    expect(ordem()).toEqual(['Conversa 1', '[Arquivadas (2)]'])
    await barra.findAll('button').find((b) => b.text().includes('Arquivadas'))!.trigger('click')
    expect(ordem()).toEqual(['Conversa 1', '[Arquivadas (2)]', 'Conversa 3', 'Conversa 2'])
  })

  test('o agrupador é empurrado para o fundo do painel', async () => {
    await montar([conversa(1), conversa(2, { arquivada_em: new Date() })])
    const agrupador = barra.findAll('button').find((b) => b.text().includes('Arquivadas'))!
    expect(agrupador.classes()).toContain('mt-auto')
    expect(barra.find('.overflow-auto').classes()).toEqual(expect.arrayContaining(['flex', 'flex-col']))
  })

  test('sem arquivadas não mostra o agrupador', async () => {
    await montar([conversa(1)])
    expect(barra.text()).not.toContain('Arquivadas')
  })

  test('pesquisando, as arquivadas aparecem junto, marcadas', async () => {
    await montar([conversa(1, { descricao: 'Time' }), conversa(2, { descricao: 'Time antigo', arquivada_em: new Date() })])
    await barra.find('input[placeholder="Pesquisar..."]').setValue('time')
    expect(ordem()).toEqual(['Time antigo', 'Time'])
    expect(barra.text()).toContain('Arquivada')
  })
})

describe('menu da conversa', () => {
  // O happy-dom não mede elementos: o tamanho do menu vem do teste
  function medirMenu(largura: number, altura: number) {
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: largura, height: altura, x: 0, y: 0, top: 0, left: 0, right: largura, bottom: altura, toJSON: () => ({}) } as DOMRect
    }
  }

  async function abrirMenu(titulo: string, x: number, y: number) {
    const linha = barra.findAll('[role="button"]').find((l) => l.text().includes(titulo))!
    await linha.trigger('contextmenu', { clientX: x, clientY: y })
    await flushPromises()
    return barra.find('.fixed.z-50')
  }

  test('abre onde clicou quando cabe', async () => {
    medirMenu(170, 80)
    await montar([conversa(1)])
    const menu = await abrirMenu('Conversa 1', 100, 200)
    expect(menu.attributes('style')).toContain('left: 100px')
    expect(menu.attributes('style')).toContain('top: 200px')
  })

  test('perto do fim da tela, recua só o tamanho real do menu (não flutua acima)', async () => {
    medirMenu(170, 40)
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
    await montar([conversa(1), conversa(2, { arquivada_em: new Date() })])
    await barra.findAll('button').find((b) => b.text().includes('Arquivadas'))!.trigger('click')
    const menu = await abrirMenu('Conversa 2', 950, 690)
    expect(menu.text()).toBe('Desarquivar')
    // 700 - 40 - 8 = 652; antes o recuo supunha 160px e o menu ia para 540
    expect(menu.attributes('style')).toContain('top: 652px')
    expect(menu.attributes('style')).toContain('left: 822px')
  })

  test('ações conforme a conversa: fixar, desafixar, arquivar', async () => {
    medirMenu(170, 80)
    rota('PATCH', '/conversa/fixadas', {})
    await montar([conversa(1), conversa(2, { fixada_ordem: 1 })])
    expect((await abrirMenu('Conversa 1', 10, 10)).text()).toBe('FixarArquivar')
    await barra.find('.fixed.z-50 button').trigger('click')
    await flushPromises()
    expect(pedidosDe('PATCH', '/conversa/fixadas')[0]!.corpo).toEqual({ conversas: [2, 1] })
    expect((await abrirMenu('Conversa 2', 10, 10)).text()).toBe('DesafixarArquivar')
  })

  test('Esc e clique fora fecham o menu', async () => {
    medirMenu(170, 80)
    await montar([conversa(1)])
    await abrirMenu('Conversa 1', 10, 10)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(barra.find('.fixed.z-50').exists()).toBe(false)
    await abrirMenu('Conversa 1', 10, 10)
    document.dispatchEvent(new MouseEvent('click'))
    await flushPromises()
    expect(barra.find('.fixed.z-50').exists()).toBe(false)
  })
})
