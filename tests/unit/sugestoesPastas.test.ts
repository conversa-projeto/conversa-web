import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PainelPastas from '@/components/PainelPastas.vue'
import { useRecursos } from '@/composables/useRecursos'
import { useChatStore } from '@/stores/chat'
import { usePastasStore } from '@/stores/pastas'
import { TipoConversa, type Mensagem, type PastaMensagens, type SugestoesPastas } from '@/types/api'
import { erro, pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'

const EU = 7
let tela: VueWrapper | undefined
let chat: ReturnType<typeof useChatStore>
let pastas: ReturnType<typeof usePastasStore>

beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
  setActivePinia(createPinia())
  chat = useChatStore()
  pastas = usePastasStore()
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

const pasta = (extras: Partial<PastaMensagens> = {}): PastaMensagens =>
  ({ id: 10, conversa_id: 1, dono_id: EU, nome: 'Financeiro', cor: '', compartilhada: false, mensagens: 1, ...extras })
const msg = (id: number) =>
  mensagem({ id, remetente_id: 2, remetente: 'Bruno', conversa_id: 1, inserida: new Date(2026, 9, 1, 12, id), visualizada: true, conteudos: [texto(`m${id}`)] })

const LISTA = [pasta(), pasta({ id: 11, nome: 'Viagem', cor: '#22c55e' })]

const analise = (extras: Partial<SugestoesPastas> = {}): SugestoesPastas => ({
  id: 'a1', conversa_id: 1, status: 'concluido', analisadas: 3, erro: '',
  sugestoes: [
    { mensagem_id: 5, pasta_id: 10, autor: 'Bruno', texto: 'A nota fiscal chegou' },
    { mensagem_id: 6, pasta_id: 11, autor: 'Eu', texto: 'Reservei o hotel' },
    { mensagem_id: 7, pasta_id: 10, autor: 'Bruno', texto: 'Boleto pago' },
  ],
  ...extras,
})

async function abrirConversa(mensagens: Mensagem[] = [msg(5), msg(6), msg(7)], lista = LISTA) {
  chat.conversas = [{ id: 1, descricao: 'Bruno', tipo: TipoConversa.Direta, inserida: new Date(), mensagens_sem_visualizar: 0 }]
  chat.conversaAtivaId = 1
  chat.definirMensagens(1, mensagens)
  rota('GET', '/pastas', lista)
  await pastas.usarConversa(1, true)
}

async function comIa(ligada = true) {
  rota('GET', '/recursos', { transcricao: false, ia: ligada })
  await useRecursos().recarregar()
}

async function montarPainel() {
  tela = mount(PainelPastas, { attachTo: document.body })
  await flushPromises()
  return tela
}

const secao = () => tela!.find('section[aria-label="Sugestões da IA"]')
const botaoSugerir = () => secao().findAll('button').find((b) => /Sugerir pastas|Analisando/.test(b.text()))!
const itens = () => tela!.findAll('[data-sugestao]')

describe('sugestões da IA no painel de pastas', () => {
  test('só aparece com a IA ligada e alguma pasta', async () => {
    await comIa(false)
    await abrirConversa()
    await montarPainel()
    expect(secao().exists()).toBe(false)
    tela!.unmount()

    await comIa()
    await abrirConversa([], [])
    await montarPainel()
    expect(secao().exists()).toBe(false)
    tela!.unmount()

    await abrirConversa()
    await montarPainel()
    expect(secao().exists()).toBe(true)
    expect(botaoSugerir().text()).toBe('Sugerir pastas')
    // Nada é pedido sem clicar
    expect(pedidosDe('POST', '/pastas/sugerir')).toHaveLength(0)
  })

  test('pedir mostra cada sugestão com a mensagem e a pasta; ✓ põe na pasta, ✕ ignora', async () => {
    await comIa()
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise())
    rota('PUT', '/pasta/mensagens', { pasta_id: 11, incluidas: 1 })
    await montarPainel()
    await botaoSugerir().trigger('click')
    await flushPromises()

    expect(pedidosDe('POST', '/pastas/sugerir')[0]!.corpo).toEqual({ conversa_id: 1, ignorar: [] })
    expect(itens()).toHaveLength(3)
    expect(itens()[0]!.text()).toContain('Bruno: A nota fiscal chegou')
    expect(itens()[0]!.text()).toContain('Financeiro')
    expect(itens()[1]!.text()).toContain('Viagem')

    // ✓: põe na pasta e marca a bolha
    await itens()[1]!.find('button[title="Pôr em Viagem"]').trigger('click')
    await flushPromises()
    expect(pedidosDe('PUT', '/pasta/mensagens')[0]!.corpo).toEqual({ pasta_id: 11, mensagens: [6] })
    expect(chat.mensagensAtivas.find((m) => m.id === 6)!.pastas).toEqual([11])
    expect(itens()).toHaveLength(2)

    // ✕: some sem chamar a API e fica lembrada no navegador
    await itens()[0]!.find('button[title="Ignorar"]').trigger('click')
    expect(itens()).toHaveLength(1)
    expect(pedidosDe('PUT', '/pasta/mensagens')).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(`conversa.sugestoesIgnoradas.${EU}.1`)!)).toEqual([5])
  })

  test('a próxima análise manda as ignoradas para a IA não trazê-las de volta', async () => {
    localStorage.setItem(`conversa.sugestoesIgnoradas.${EU}.1`, JSON.stringify([3, 4]))
    // De outra conversa e de outra pessoa não entram
    localStorage.setItem(`conversa.sugestoesIgnoradas.${EU}.2`, JSON.stringify([99]))
    localStorage.setItem('conversa.sugestoesIgnoradas.8.1', JSON.stringify([98]))
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise({ sugestoes: [] }))
    await pastas.sugerirPastas()
    expect(pedidosDe('POST', '/pastas/sugerir')[0]!.corpo.ignorar).toEqual([3, 4])
  })

  test('"Aceitar todas" faz uma chamada por pasta e esvazia a lista', async () => {
    await comIa()
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise())
    rota('PUT', '/pasta/mensagens', { incluidas: 1 })
    await montarPainel()
    await botaoSugerir().trigger('click')
    await flushPromises()
    await secao().findAll('button').find((b) => b.text() === 'Aceitar todas (3)')!.trigger('click')
    await flushPromises()
    expect(pedidosDe('PUT', '/pasta/mensagens').map((p) => p.corpo)).toEqual([
      { pasta_id: 10, mensagens: [5, 7] },
      { pasta_id: 11, mensagens: [6] },
    ])
    expect(itens()).toHaveLength(0)
    expect(secao().text()).toContain('Nenhuma sugestão pendente.')
  })

  test('falha ao pôr na pasta avisa e a sugestão continua', async () => {
    await comIa()
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise())
    rota('PUT', '/pasta/mensagens', erro(400, 'Alguma das mensagens não é desta conversa.'))
    await montarPainel()
    await botaoSugerir().trigger('click')
    await flushPromises()
    await itens()[0]!.find('button[title="Pôr em Financeiro"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Alguma das mensagens não é desta conversa.')
    expect(itens()).toHaveLength(3)
  })

  test('enquanto a IA analisa, consulta até ficar pronto', async () => {
    const relogio = relogioFalso()
    try {
      await comIa()
      await abrirConversa()
      rota('POST', '/pastas/sugerir', analise({ status: 'processando', sugestoes: [] }))
      let consultas = 0
      rota('GET', '/pastas/sugestao', () => (++consultas < 2 ? analise({ status: 'processando', sugestoes: [] }) : analise()))
      await montarPainel()
      await botaoSugerir().trigger('click')
      await flushPromises()
      expect(botaoSugerir().text()).toBe('Analisando...')
      expect(botaoSugerir().attributes('disabled')).toBeDefined()
      expect(secao().find('[role="status"]').exists()).toBe(true)
      await relogio.rodar(new Promise((ok) => setTimeout(ok, 0)).then(async () => {
        relogio.avancar(2000)
        await flushPromises()
        relogio.avancar(2000)
        await flushPromises()
      }))
      expect(consultas).toBe(2)
      expect(pedidosDe('GET', '/pastas/sugestao')[0]!.consulta).toEqual({ id: 'a1' })
      expect(itens()).toHaveLength(3)
      expect(botaoSugerir().text()).toBe('Sugerir pastas')
    } finally {
      relogio.restaurar()
    }
  })

  test('erro do servidor de IA aparece no painel', async () => {
    await comIa()
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise({ status: 'erro', erro: 'O servidor de IA respondeu 404', sugestoes: [] }))
    await montarPainel()
    await botaoSugerir().trigger('click')
    await flushPromises()
    expect(secao().text()).toContain('O servidor de IA respondeu 404')

    rota('POST', '/pastas/sugerir', erro(400, 'Crie uma pasta antes de pedir sugestões.'))
    await botaoSugerir().trigger('click')
    await flushPromises()
    expect(secao().text()).toContain('Crie uma pasta antes de pedir sugestões.')
  })

  test('tudo já em pasta: avisa; sem sugestão: avisa também', async () => {
    await comIa()
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise({ analisadas: 0, sugestoes: [] }))
    await montarPainel()
    await botaoSugerir().trigger('click')
    await flushPromises()
    expect(secao().text()).toContain('As mensagens recentes já estão em pastas.')
    rota('POST', '/pastas/sugerir', analise({ sugestoes: [] }))
    await botaoSugerir().trigger('click')
    await flushPromises()
    expect(secao().text()).toContain('Nenhuma sugestão pendente.')
  })

  test('sugestão de pasta excluída some; trocar de conversa limpa as sugestões', async () => {
    await abrirConversa()
    rota('POST', '/pastas/sugerir', analise())
    await pastas.sugerirPastas()
    expect(pastas.sugestoesPendentes).toHaveLength(3)
    rota('DELETE', '/pasta', { id: 11 })
    await pastas.excluir(11)
    expect(pastas.sugestoesPendentes.map((s) => s.mensagem_id)).toEqual([5, 7])

    await pastas.usarConversa(2, false)
    expect(pastas.sugestoesPendentes).toEqual([])
    expect(pastas.analise).toBeNull()
  })

  test('resposta que chega depois de trocar de conversa é descartada', async () => {
    await abrirConversa()
    let liberar: (valor: SugestoesPastas) => void = () => {}
    rota('POST', '/pastas/sugerir', () => new Promise<SugestoesPastas>((ok) => { liberar = ok }))
    const pedido = pastas.sugerirPastas()
    await flushPromises()
    rota('GET', '/pastas', [])
    await pastas.usarConversa(3, true)
    liberar(analise())
    await pedido
    expect(pastas.sugestoesPendentes).toEqual([])
    expect(pastas.analise).toBeNull()
  })
})
