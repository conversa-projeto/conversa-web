import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AtividadesPage from '@/components/AtividadesPage.vue'
import NavBar from '@/components/NavBar.vue'
import { useAtividadesStore } from '@/stores/atividades'
import { TipoAtividade, TipoConversa } from '@/types/api'
import { aguardar, pedidosDe, rota } from './apiFalsa'

// Atividade como a API devolve
function atividadeApi(id: number, extras: Record<string, unknown> = {}) {
  return {
    id, tipo: TipoAtividade.Reacao, criado_em: new Date().toISOString(), nova: false,
    autor_id: 2, autor_nome: 'Bruno', autor_avatar_url: null,
    conversa_id: 1, conversa_tipo: TipoConversa.Direta, conversa_descricao: null,
    mensagem_id: 10, conteudo_tipo: 1, texto: 'bom dia', chamada_id: null, chamada_tipo: null, emoji: '😂',
    ...extras,
  }
}

let tela: VueWrapper | undefined
beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  setActivePinia(createPinia())
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

describe('store de atividades', () => {
  test('abrir carrega a lista e marca como visto, zerando o contador', async () => {
    rota('GET', '/atividades', [atividadeApi(2, { nova: true }), atividadeApi(1)])
    rota('POST', '/atividades/vistas', { vistas_em: new Date().toISOString() })
    const atividades = useAtividadesStore()
    atividades.novas = 2
    await atividades.abrir()
    expect(atividades.lista.map((a) => a.id)).toEqual([2, 1])
    expect(atividades.lista[0]!.criado_em).toBeInstanceOf(Date)
    // A da lista segue destacada enquanto a tela está aberta
    expect(atividades.lista[0]!.nova).toBe(true)
    expect(atividades.novas).toBe(0)
    expect(pedidosDe('POST', '/atividades/vistas')).toHaveLength(1)
  })

  test('carregar mais pede as anteriores à última da lista, até acabar', async () => {
    rota('GET', '/atividades', (pedido: { consulta: Record<string, string> }) =>
      pedido.consulta.antes === '0'
        ? Array.from({ length: 30 }, (_, i) => atividadeApi(100 - i))
        : [atividadeApi(50)])
    const atividades = useAtividadesStore()
    await atividades.carregar()
    expect(atividades.fim).toBe(false)
    await atividades.carregarMais()
    expect(pedidosDe('GET', '/atividades').at(-1)!.consulta).toEqual({ antes: '71', limite: '30' })
    expect(atividades.lista).toHaveLength(31)
    expect(atividades.fim).toBe(true)
    await atividades.carregarMais()
    expect(pedidosDe('GET', '/atividades')).toHaveLength(2)
  })

  test('aviso com a tela fechada só atualiza o contador; aberta, recarrega e marca como visto', async () => {
    rota('GET', '/atividades/novas', { quantidade: 4 })
    rota('GET', '/atividades', [atividadeApi(1)])
    rota('POST', '/atividades/vistas', { vistas_em: new Date().toISOString() })
    const atividades = useAtividadesStore()
    await atividades.aoReceberAviso()
    expect(atividades.novas).toBe(4)
    expect(pedidosDe('GET', '/atividades')).toHaveLength(0)

    atividades.aberta = true
    await atividades.aoReceberAviso()
    expect(atividades.novas).toBe(0)
    expect(pedidosDe('GET', '/atividades')).toHaveLength(1)
  })
})

describe('tela de atividades', () => {
  async function abrirTela(lista: object[]) {
    rota('GET', '/atividades', lista)
    rota('POST', '/atividades/vistas', { vistas_em: new Date().toISOString() })
    tela = mount(AtividadesPage, { attachTo: document.body })
    await aguardar(10)
    return tela
  }

  test('sem nada, explica o que aparece ali', async () => {
    await abrirTela([])
    expect(tela!.text()).toContain('Nenhuma atividade ainda.')
  })

  test('descreve cada tipo, com a prévia e onde foi (só em grupo)', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await abrirTela([
      atividadeApi(4, { nova: true }),
      atividadeApi(3, { tipo: TipoAtividade.Resposta, emoji: null, texto: 'claro!' }),
      atividadeApi(2, { tipo: TipoAtividade.Mencao, emoji: null, texto: 'olha @Eu', conversa_tipo: TipoConversa.Grupo, conversa_descricao: 'Equipe' }),
      atividadeApi(1, { tipo: TipoAtividade.ChamadaPerdida, emoji: null, texto: null, mensagem_id: null, chamada_id: 7, chamada_tipo: 2, criado_em: ontem }),
    ])
    const itens = tela!.findAll('button').map((b) => b.text())
    expect(itens[0]).toContain('Bruno reagiu 😂 à sua mensagem')
    expect(itens[0]).toContain('“bom dia”')
    expect(itens[1]).toContain('respondeu sua mensagem')
    expect(itens[2]).toContain('mencionou você')
    expect(itens[2]).toContain('em Equipe')
    expect(itens[3]).toContain('chamada de vídeo perdida')
    expect(tela!.text()).toContain('Hoje')
    expect(tela!.text()).toContain('Ontem')
    // Só a nova fica destacada
    expect(tela!.findAll('[title="Nova"]')).toHaveLength(1)
  })

  test('anexo sem texto aparece pelo tipo', async () => {
    await abrirTela([atividadeApi(1, { texto: null, conteudo_tipo: 7 })])
    expect(tela!.text()).toContain('“Figurinha”')
  })

  test('clicar abre a mensagem; chamada perdida abre a conversa', async () => {
    await abrirTela([atividadeApi(2), atividadeApi(1, { tipo: TipoAtividade.ChamadaPerdida, mensagem_id: null, chamada_id: 7, conversa_id: 3 })])
    const [reacao, chamada] = tela!.findAll('button')
    await reacao!.trigger('click')
    await chamada!.trigger('click')
    expect(tela!.emitted('open-message')).toEqual([[1, 10]])
    expect(tela!.emitted('open-conversa')).toEqual([[3]])
  })

  test('ao sair da tela, os avisos voltam a só contar', async () => {
    await abrirTela([])
    expect(useAtividadesStore().aberta).toBe(true)
    tela!.unmount()
    tela = undefined
    expect(useAtividadesStore().aberta).toBe(false)
  })
})

describe('contador na barra', () => {
  const props = { secaoAtiva: 'chat', avatarUrl: '', inicialUsuario: 'E', sipDisponivel: false, sipStatus: 'desconectado' as const }

  test('mostra as novas no ícone de Atividades; sem novas, nada', () => {
    tela = mount(NavBar, { props: { ...props, atividadesNovas: 3 } })
    expect(tela.text()).toContain('3Atividades')
    tela.unmount()
    tela = mount(NavBar, { props: { ...props, atividadesNovas: 0 } })
    expect(tela.text()).toContain('ChatAtividades')
  })

  test('acima de 99 mostra 99+', () => {
    tela = mount(NavBar, { props: { ...props, atividadesNovas: 150 } })
    expect(tela.text()).toContain('99+Atividades')
  })
})
