import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NavBar from '@/components/NavBar.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import ChamadaHistorico from '@/components/ChamadaHistorico.vue'
import DateInput from '@/components/DateInput.vue'
import { useChatStore } from '@/stores/chat'
import { useCallStore } from '@/stores/call'
import { TipoConversa, type Contato, type Conversa } from '@/types/api'
import { aguardar, pedidosDe, rota, SocketFalso } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { instalarWebrtcFalso } from './webrtcFalso'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
const contato = (id: number, nome: string): Contato => ({ id, nome, login: nome.toLowerCase(), email: `${nome.toLowerCase()}@t` } as Contato)
const conversa = (id: number, extras: Partial<Conversa> = {}): Conversa => ({ id, descricao: `Conversa ${id}`, tipo: TipoConversa.Direta, inserida: new Date(), ...extras } as Conversa)

beforeEach(() => {
  instalarWebrtcFalso()
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('barra de navegação', () => {
  const props = { secaoAtiva: 'chat', avatarUrl: '', inicialUsuario: 'E', sipDisponivel: false, sipStatus: 'desconectado' as const }
  // Desktop e celular têm a mesma barra; o teste usa a do desktop
  const desktop = (tela: VueWrapper) => tela.findAll('nav')[0]!

  test('itens principais; Ramal só com SIP disponível', async () => {
    const tela = montar(NavBar, { props })
    expect(desktop(tela).findAll('button').map((b) => b.text())).toEqual(['E', 'Chat', 'Atividades', 'Equipes', 'Chamadas', 'Anexos'])
    await tela.setProps({ sipDisponivel: true })
    expect(desktop(tela).text()).toContain('Ramal')
  })

  test('marca a seção ativa; clicar troca a seção, e Ramal abre o discador', async () => {
    const tela = montar(NavBar, { props: { ...props, sipDisponivel: true } })
    const chat = desktop(tela).findAll('button').find((b) => b.text() === 'Chat')!
    expect(chat.classes()).toContain('text-primary-500')
    await desktop(tela).findAll('button').find((b) => b.text() === 'Anexos')!.trigger('click')
    await desktop(tela).findAll('button').find((b) => b.text() === 'Ramal')!.trigger('click')
    await tela.findAll('nav')[1]!.findAll('button')[0]!.trigger('click')
    expect(tela.emitted('update:secaoAtiva')).toEqual([['anexos'], ['config']])
    expect(tela.emitted('open-dialer')).toHaveLength(1)
  })

  test.each([['conectado', 'bg-success-500'], ['conectando', 'bg-warning-400'], ['erro', 'bg-danger-500']] as const)('status do ramal %s tem a cor certa', (sipStatus, cor) => {
    const tela = montar(NavBar, { props: { ...props, sipDisponivel: true, sipStatus } })
    expect(desktop(tela).find(`span.${cor}`).exists()).toBe(true)
  })

  test('ramal desconectado não mostra bolinha', () => {
    const tela = montar(NavBar, { props: { ...props, sipDisponivel: true } })
    expect(desktop(tela).find('span.rounded-full.border-2').exists()).toBe(false)
  })

  test('foto do perfil; se falhar, avisa quem montou', async () => {
    const tela = montar(NavBar, { props: { ...props, avatarUrl: 'https://localhost/storage/eu' } })
    expect(tela.findAll('img[alt="Perfil"]')).toHaveLength(2)
    await tela.find('img[alt="Perfil"]').trigger('error')
    expect(tela.emitted('avatar-error')).toHaveLength(1)
  })
})

describe('cabeçalho da conversa', () => {
  function montarCabecalho(ativa: Conversa, extras: { contatos?: Contato[]; online?: number[] } = {}) {
    const chat = useChatStore()
    chat.contatos = extras.contatos ?? [contato(2, 'Bruno'), contato(3, 'Carla')]
    chat.conversas = [ativa]
    chat.conversaAtivaId = ativa.id
    chat.usuariosOnline = new Set(extras.online ?? [])
    return montar(ChatHeader)
  }

  test('conversa direta: nome, foto, online e perfil ao clicar na foto', async () => {
    const tela = montarCabecalho(conversa(1, { descricao: 'Bruno', destinatario_id: 2, avatar_url: 'https://localhost/storage/b' }), { online: [2] })
    expect(tela.find('h2').text()).toBe('Bruno')
    expect(tela.find('img[alt="Avatar"]').attributes('src')).toBe('https://localhost/storage/b')
    expect(tela.find('span.bg-success-500').exists()).toBe(true)
    expect(tela.find('button[title="Gerenciar membros"]').exists()).toBe(false)
    await tela.find('button.h-10').trigger('click')
    expect(document.body.textContent).toContain('bruno@t')
  })

  test('foto que falha vira a inicial', async () => {
    const tela = montarCabecalho(conversa(1, { descricao: 'Bruno', destinatario_id: 2, avatar_url: 'x' }))
    await tela.find('img[alt="Avatar"]').trigger('error')
    expect(tela.find('button.h-10').text()).toBe('B')
  })

  test('grupo: carrega e lista os membros; clicar num membro abre conversa com ele', async () => {
    rota('GET', '/conversa/usuarios', [{ id: 1, usuario_id: 2, nome: 'Bruno' }, { id: 2, usuario_id: 3, nome: 'Carla', avatar_url: 'https://localhost/storage/c' }])
    rota('GET', '/mensagens', [])
    const tela = montarCabecalho(conversa(5, { tipo: TipoConversa.Grupo, descricao: 'Equipe' }), { contatos: [contato(2, 'Bruno'), contato(3, 'Carla')] })
    useChatStore().conversas.push(conversa(9, { destinatario_id: 2 }))
    await aguardar(10)
    expect(tela.text()).toContain('Bruno, Carla')
    expect(tela.find('img[src="https://localhost/storage/c"]').exists()).toBe(true)
    await tela.find('button[title="Gerenciar membros"]').trigger('click')
    expect(tela.emitted('open-group-members')).toHaveLength(1)
    await tela.findAll('.group button').find((b) => b.text().includes('Bruno'))!.trigger('click')
    await aguardar(10)
    expect(tela.emitted('open-chat-with')).toEqual([[2]])
    expect(useChatStore().conversaAtivaId).toBe(9)
  })

  test.each([
    [TipoConversa.Direta, [2], [], 'Digitando...'],
    [TipoConversa.Direta, [], [2], 'Gravando áudio...'],
    [TipoConversa.Grupo, [2, 3], [], 'Bruno e Carla estão digitando...'],
    [TipoConversa.Grupo, [], [2], 'Bruno está gravando áudio...'],
  ])('atividade: tipo %p, digitando %p, gravando %p', async (tipo, digitando, gravando, esperado) => {
    rota('GET', '/conversa/usuarios', [])
    const tela = montarCabecalho(conversa(1, { tipo, destinatario_id: 2 }))
    // Os avisos chegam pelo socket
    localStorage.setItem('conversa.token', 'token')
    const chat = useChatStore()
    chat.conectarWebSocket()
    const socket = SocketFalso.ultimo()
    socket.abrir()
    for (const id of digitando) socket.receber({ tipo: 4, conversa_id: 1, usuario_id: id })
    for (const id of gravando) socket.receber({ tipo: 5, conversa_id: 1, usuario_id: id })
    await tela.vm.$nextTick()
    chat.desconectarWebSocket()
    expect(tela.find('.typing-subtitle').classes()).toContain('typing-subtitle-open')
    expect(tela.find('.typing-subtitle').text()).toBe(esperado)
  })

  test('botões de chamada; somem durante uma chamada', async () => {
    const tela = montarCabecalho(conversa(1, { destinatario_id: 2 }))
    await tela.find('button[title="Chamada de voz"]').trigger('click')
    await tela.find('button[title="Chamada de video"]').trigger('click')
    await tela.find('button[title="Compartilhar tela"]').trigger('click')
    expect(tela.emitted('start-call')).toEqual([[1], [2], [2, true]])
    useCallStore().estado = 'ativa'
    await tela.vm.$nextTick()
    expect(tela.find('button[title="Chamada de voz"]').exists()).toBe(false)
  })

  test('pesquisa: Enter busca, resultados do mais antigo ao mais novo, clique vai à mensagem, X limpa', async () => {
    rota('GET', '/pesquisar', [mensagem({ id: 11, conversa_id: 1, conteudos: [texto('primeiro oi')] }), mensagem({ id: 10, conversa_id: 1, conteudos: [texto('oi antigo')] }), mensagem({ id: 50, conversa_id: 2 })])
    const tela = montarCabecalho(conversa(1, { destinatario_id: 2 }))
    const campo = tela.find('input[placeholder="Pesquisar..."]')
    await campo.setValue('oi')
    await campo.trigger('keyup', { key: 'Enter' })
    await aguardar(10)
    expect(pedidosDe('GET', '/pesquisar')[0]!.consulta).toEqual({ texto: 'oi', conversa: '1' })
    const resultados = tela.findAll('.border-warning-200 button')
    expect(resultados.map((r) => r.text())).toEqual(['#10 - oi antigo', '#11 - primeiro oi'])
    await resultados[0]!.trigger('click')
    expect(tela.emitted('go-to-message')).toEqual([[10]])
    await campo.element.nextElementSibling!.dispatchEvent(new Event('click'))
    await tela.vm.$nextTick()
    expect(useChatStore().resultadosBuscaConversa).toEqual([])
  })

  test('pesquisa no celular: abre o painel, busca pelo botão e fecha limpando', async () => {
    rota('GET', '/pesquisar', [mensagem({ id: 3, conversa_id: 1, conteudos: [texto('achou')] })])
    const tela = montarCabecalho(conversa(1, { destinatario_id: 2 }))
    await tela.find('button[title="Pesquisar na conversa"]').trigger('click')
    await tela.find('input[placeholder="Pesquisar nesta conversa"]').setValue('achou')
    await tela.find('.mt-2.md\\:hidden button').trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('#3 - achou')
    await tela.find('button[title="Pesquisar na conversa"]').trigger('click')
    expect(tela.find('input[placeholder="Pesquisar nesta conversa"]').exists()).toBe(false)
    expect(useChatStore().resultadosBuscaConversa).toEqual([])
  })

  test('abrir a lateral no celular; conversa sem nome usa o número', async () => {
    const tela = montarCabecalho(conversa(4, { descricao: '', destinatario_id: 2 }))
    expect(tela.find('h2').text()).toBe('Conversa #4')
    await tela.find('button.md\\:hidden').trigger('click')
    expect(tela.emitted('update:sidebar-aberta')).toEqual([[true]])
  })

  test('Ver anexos no perfil fecha o perfil e avisa', async () => {
    const tela = montarCabecalho(conversa(1, { descricao: 'Bruno', destinatario_id: 2 }))
    await tela.find('button.h-10').trigger('click')
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ver anexos'))!.click()
    await tela.vm.$nextTick()
    expect(tela.emitted('open-anexos')).toEqual([[1]])
    expect(document.body.textContent).not.toContain('bruno@t')
  })
})

describe('histórico de chamadas', () => {
  const hoje = new Date()
  const ontem = new Date(hoje.getTime() - 86_400_000)
  const antiga = new Date(2026, 0, 15, 10, 30)
  const participantes = (...nomes: [number, string][]) => nomes.map(([usuario_id, nome]) => ({ usuario_id, nome, status: 1, duracao: null }))
  const chamadas = [
    { id: 1, tipo: 2, status: 4, criado_em: hoje.toISOString(), criado_por: 7, conversa_id: 10, iniciada: null, finalizada: null, duracao: 65, participantes: participantes([7, 'Eu'], [2, 'Bruno']) },
    { id: 2, tipo: 1, status: 5, criado_em: ontem.toISOString(), criado_por: 3, conversa_id: 11, iniciada: null, finalizada: null, duracao: null, participantes: participantes([3, 'Carla'], [7, 'Eu']) },
    { id: 3, tipo: 1, status: 2, criado_em: antiga.toISOString(), criado_por: 7, conversa_id: null, iniciada: null, finalizada: null, duracao: null, participantes: participantes([7, 'Eu'], [2, 'Bruno'], [3, 'Carla']) },
  ]

  async function montarHistorico() {
    rota('GET', '/chamadas', chamadas)
    const tela = montar(ChamadaHistorico)
    await aguardar(10)
    return tela
  }

  test('agrupa por dia (Hoje, Ontem, data) e mostra tipo, duração ou status', async () => {
    const tela = await montarHistorico()
    expect(tela.findAll('.sticky').map((g) => g.text())).toEqual(['Hoje', 'Ontem', '15/01/2026'])
    const linhas = tela.findAll('.group')
    expect(linhas[0]!.text()).toContain('Bruno')
    expect(linhas[0]!.text()).toMatch(/Video\s+· 01:05/)
    expect(linhas[1]!.text()).toMatch(/Audio\s+· Perdida/)
    expect(linhas[1]!.find('.text-danger-600').text()).toBe('Carla')
    expect(linhas[2]!.text()).toContain('Grupo (3)')
    expect(linhas[2]!.text()).toContain('Recusada')
  })

  test('filtros: perdidas e nome', async () => {
    const tela = await montarHistorico()
    await tela.findAll('button').find((b) => b.text() === 'Perdidas')!.trigger('click')
    expect(tela.findAll('.group')).toHaveLength(1)
    await tela.find('input[placeholder="Buscar contato"]').setValue('bruno')
    expect(tela.text()).toContain('Nenhuma chamada perdida')
    await tela.findAll('button').find((b) => b.text() === 'Todas')!.trigger('click')
    expect(tela.findAll('.group')).toHaveLength(1)
    await tela.find('input[placeholder="Buscar contato"]').setValue('ninguém')
    expect(tela.text()).toContain('Nenhuma chamada')
  })

  test('datas de/até refazem a busca no servidor', async () => {
    const tela = await montarHistorico()
    const [de, ate] = tela.findAllComponents(DateInput)
    de!.vm.$emit('update:modelValue', '2026-01-01')
    await aguardar(10)
    ate!.vm.$emit('update:modelValue', '2026-01-31')
    await aguardar(10)
    expect(pedidosDe('GET', '/chamadas').map((p) => [p.consulta.de, p.consulta.ate])).toEqual([['', ''], ['2026-01-01', ''], ['2026-01-01', '2026-01-31']])
  })

  test('clicar abre a conversa; religar liga de novo para os mesmos', async () => {
    const tela = await montarHistorico()
    const call = useCallStore()
    const iniciar = mock((_tipo: number, _usuarios: { id: number }[]) => Promise.resolve())
    call.iniciarChamada = iniciar as never
    await tela.findAll('.group')[0]!.trigger('click')
    await tela.findAll('.group')[2]!.trigger('click')
    expect(tela.emitted('open-conversa')).toEqual([[10]])
    await tela.findAll('button[title="Ligar novamente"]')[0]!.trigger('click')
    expect(iniciar.mock.calls).toEqual([[2, [{ id: 7 }, { id: 2 }]]])
    expect(tela.emitted('open-conversa')).toHaveLength(1)
  })

  test('falha ao carregar mostra lista vazia', async () => {
    const tela = montar(ChamadaHistorico)
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Carregando...')
    await aguardar(10)
    expect(tela.text()).toContain('Nenhuma chamada')
  })
})
