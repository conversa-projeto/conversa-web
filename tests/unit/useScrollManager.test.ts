import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useScrollManager } from '@/composables/useScrollManager'
import { useChatStore } from '@/stores/chat'
import { TipoConversa, type Mensagem } from '@/types/api'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'

// ResizeObserver falso: o happy-dom não calcula layout. Guarda os observadores
// para o teste ver quais estão ligados.
const observadores = new Set<ObservadorFalso>()
class ObservadorFalso {
  constructor(public retorno: ResizeObserverCallback) {}
  observe() { observadores.add(this) }
  unobserve() {}
  disconnect() { observadores.delete(this) }
}

// Para onde a rolagem foi pedida
const rolagens: { id: string; comportamento?: string }[] = []

let host: VueWrapper
let gerente: ReturnType<typeof useScrollManager>
let chat: ReturnType<typeof useChatStore>

// Componente mínimo com o contêiner e as mensagens, como o MessageList
const Lista = defineComponent({
  setup() {
    gerente = useScrollManager()
    return () => h('div', { ref: gerente.mensagensContainer }, [
      h('div', { ref: gerente.conteudoMensagens }, chat.mensagensAtivas.map((m: Mensagem) => h('div', { id: `msg-${m.id}`, key: m.id }, m.conteudos[0]?.conteudo))),
    ])
  },
})

function mensagemApi(id: number) {
  return { id, remetente_id: 2, remetente: 'Bruno', conversa_id: 1, inserida: new Date(Date.UTC(2026, 0, 1, 0, 0, id)).toISOString(), alterada: null, visivel_em: null, recebida: true, visualizada: true, reproduzida: false, conteudos: [{ ordem: 1, tipo: 1, conteudo: `m${id}` }] }
}

const rolagemOriginal = Element.prototype.scrollIntoView
beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
  chat = useChatStore()
  chat.conversas = [{ id: 1, descricao: 'x', tipo: TipoConversa.Direta, inserida: new Date(), mensagens_sem_visualizar: 0 }]
  chat.conversaAtivaId = 1
  observadores.clear()
  rolagens.length = 0
  globalThis.ResizeObserver = ObservadorFalso as never
  Element.prototype.scrollIntoView = function (opcoes?: boolean | ScrollIntoViewOptions) {
    rolagens.push({ id: this.id, comportamento: typeof opcoes === 'object' ? opcoes.behavior : undefined })
  }
})
afterEach(() => {
  host?.unmount()
  Element.prototype.scrollIntoView = rolagemOriginal
})

async function montar(ids: number[]) {
  chat.definirMensagens(1, ids.map((id) => mensagem({ id, conteudos: [texto(`m${id}`)], visualizada: true })))
  host = mount(Lista, { attachTo: document.body })
  await flushPromises()
}

describe('ir até uma mensagem (pesquisa, resposta)', () => {
  test('desliga o observador que prende a rolagem no fim (senão o conteúdo novo puxaria de volta)', async () => {
    await montar([1, 2, 3])
    await gerente.posicionarAberturaConversaAtiva()
    expect(observadores.size).toBe(1)
    expect(await gerente.irParaMensagem(2)).toBe(true)
    expect(observadores.size).toBe(0)
  })

  test('mensagem já na lista: rolagem suave até ela, com destaque que some', async () => {
    const relogio = relogioFalso()
    try {
      await montar([1, 2, 3])
      expect(await gerente.irParaMensagem(2)).toBe(true)
      expect(rolagens).toEqual([{ id: 'msg-2', comportamento: 'smooth' }])
      expect(document.getElementById('msg-2')!.classList.contains('ring-2')).toBe(true)
      relogio.avancar(1200)
      expect(document.getElementById('msg-2')!.classList.contains('ring-2')).toBe(false)
      expect(pedidosDe('GET', '/mensagens')).toHaveLength(0)
    } finally {
      relogio.restaurar()
    }
  })

  test('mensagem fora da lista: carrega o trecho dela e rola sem animação, repetindo depois do layout', async () => {
    await montar([50, 51])
    rota('GET', '/mensagens', [mensagemApi(9), mensagemApi(10), mensagemApi(11)])
    expect(await gerente.irParaMensagem(10)).toBe(true)
    await aguardar(40)
    expect(pedidosDe('GET', '/mensagens')[0]!.consulta).toMatchObject({ mensagemreferencia: '10', mensagensprevias: '30', mensagensseguintes: '30' })
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([9, 10, 11])
    expect(rolagens.map((r) => r.comportamento)).toEqual(['instant', 'instant'])
  })

  test('mensagem que não existe mais: informa que não achou', async () => {
    await montar([1])
    rota('GET', '/mensagens', [])
    expect(await gerente.irParaMensagem(99)).toBe(false)
    expect(rolagens).toEqual([])
  })
})

describe('abertura da conversa', () => {
  test('sem não lidas, vai para o fim e liga o observador', async () => {
    await montar([1, 2])
    await gerente.posicionarAberturaConversaAtiva()
    expect(observadores.size).toBe(1)
  })

  test('sem conversa ou sem mensagens, não faz nada', async () => {
    await montar([])
    expect(await gerente.posicionarAberturaConversaAtiva()).toBeNull()
    expect(observadores.size).toBe(0)
  })
})
