import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageBubble from '@/components/MessageBubble.vue'
import BolhaImagem from '@/components/BolhaImagem.vue'
import BolhaCodigo from '@/components/BolhaCodigo.vue'
import BolhaEmoji from '@/components/BolhaEmoji.vue'
import BolhaReferencia from '@/components/BolhaReferencia.vue'
import BolhaTextoCurto from '@/components/BolhaTextoCurto.vue'
import BolhaPadrao from '@/components/BolhaPadrao.vue'
import BolhaChamada from '@/components/BolhaChamada.vue'
import BolhaExcluida from '@/components/BolhaExcluida.vue'
import BolhaPostagem from '@/components/BolhaPostagem.vue'
import MensagemAcoes from '@/components/MensagemAcoes.vue'
import { TipoConteudo, TipoMensagemReferencia, type Mensagem } from '@/types/api'
import { comReferencia, conteudo, mensagem, texto } from './fabrica'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { useChatStore } from '@/stores/chat'

const montados: VueWrapper[] = []
function bolha(m: Mensagem, extras: { isOwn?: boolean; isGroup?: boolean } = {}) {
  const w = mount(MessageBubble, {
    props: { mensagem: m, isOwn: false, isGroup: false, mudouRemetente: false, getAnexoUrl: (id: string) => `https://localhost/storage/${id}`, ...extras },
    attachTo: document.body,
  })
  montados.push(w)
  return w
}

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => montados.splice(0).forEach((w) => w.unmount()))

describe('despachante de bolhas', () => {
  const casos: [string, Mensagem, object][] = [
    ['uma imagem', mensagem({ conteudos: [conteudo(TipoConteudo.Imagem, 'img-1', { nome: 'foto.png' })] }), BolhaImagem],
    ['só código', mensagem({ conteudos: [texto('```ts\nconst a = 1\n```')] }), BolhaCodigo],
    ['só emoji', mensagem({ conteudos: [texto('🎉🎉')] }), BolhaEmoji],
    ['resposta', mensagem({ conteudos: [texto('sim')], ...comReferencia([texto('vamos?')]) }), BolhaReferencia],
    ['texto curto', mensagem({ conteudos: [texto('oi')] }), BolhaTextoCurto],
    ['texto longo', mensagem({ conteudos: [texto('uma linha\noutra linha')] }), BolhaPadrao],
    ['chamada', mensagem({ conteudos: [conteudo(TipoConteudo.Chamada, JSON.stringify({ chamada_id: 1, tipo: 1, status: 4, duracao: 65, participantes: [] }))] }), BolhaChamada],
    ['postagem', mensagem({ conteudos: [texto('oi')], postagem: { titulo: null, respostas: 0, nao_lidas: 0, ultimas: [] } }), BolhaPostagem],
  ]

  test.each(casos)('%s usa a bolha certa, e só ela', (_nome, m, esperado) => {
    const tela = bolha(m)
    for (const [, , componente] of casos) {
      expect(tela.findComponent(componente as never).exists()).toBe(componente === esperado)
    }
  })

  test('cada mensagem fica num elemento com o id dela (a pesquisa rola até ele)', () => {
    expect(bolha(mensagem({ id: 42, conteudos: [texto('oi')] })).attributes('id')).toBe('msg-42')
  })
})

describe('conteúdo das bolhas', () => {
  test('texto curto em grupo mostra quem enviou; a própria mensagem, não', () => {
    const doOutro = bolha(mensagem({ remetente: 'Bruno', conteudos: [texto('oi')] }), { isGroup: true })
    expect(doOutro.text()).toContain('Bruno')
    const minha = bolha(mensagem({ remetente: 'Eu', conteudos: [texto('oi')] }), { isGroup: true, isOwn: true })
    expect(minha.text()).not.toContain('Eu')
  })

  test('links no texto viram links que abrem em outra aba', () => {
    const tela = bolha(mensagem({ conteudos: [texto('veja www.exemplo.com.br')] }))
    const link = tela.find('a[href="https://www.exemplo.com.br"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('target')).toBe('_blank')
  })

  test('resposta mostra quem e o que foi respondido', () => {
    const tela = bolha(mensagem({ conteudos: [texto('concordo')], ...comReferencia([texto('Vamos amanhã?')]) }))
    expect(tela.text()).toContain('Bruno')
    expect(tela.text()).toContain('Vamos amanhã?')
    expect(tela.text()).toContain('concordo')
  })

  test('encaminhada diz de quem veio', () => {
    const tela = bolha(mensagem({ conteudos: [texto('olha')], ...comReferencia([texto('original')], TipoMensagemReferencia.Encaminhada) }))
    expect(tela.text()).toContain('Encaminhado de Bruno')
  })

  test('encaminhada de uma encaminhada mostra o conteúdo original uma vez só, em cada nível', () => {
    const codigo = texto('INDICE_UNICO_X')
    const doRaul = { id: 10, remetente: 'Raul', conteudos: [codigo] }
    // Daniel encaminhou a do Raul (a encaminhada leva uma cópia do conteúdo)
    const doDaniel = { id: 11, remetente: 'Daniel', conteudos: [codigo], mensagem_referencia: { tipo: TipoMensagemReferencia.Encaminhada, mensagem: doRaul } }
    // ...que foi citada por outra do Daniel, encaminhada com um comentário
    const comentario = { id: 12, remetente: 'Daniel', conteudos: [codigo, texto('veja isso')], mensagem_referencia: { tipo: TipoMensagemReferencia.Encaminhada, mensagem: doDaniel } }
    const tela = bolha(mensagem({ conteudos: [codigo, texto('veja isso'), texto('teste no grupo')], mensagem_referencia: { tipo: TipoMensagemReferencia.Encaminhada, mensagem: comentario } }))
    expect(tela.text().split('INDICE_UNICO_X')).toHaveLength(2)
    expect(tela.text().split('veja isso')).toHaveLength(2)
    expect(tela.text()).toContain('teste no grupo')
    expect(tela.text()).toContain('Encaminhado de Raul')
  })

  test('resposta a uma resposta com o mesmo texto não esconde nada', () => {
    const anterior = { id: 20, remetente: 'Bruno', conteudos: [texto('ok')], mensagem_referencia: { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: 19, remetente: 'Ana', conteudos: [texto('ok')] } } }
    const tela = bolha(mensagem({ conteudos: [texto('beleza')], mensagem_referencia: { tipo: TipoMensagemReferencia.Resposta, mensagem: anterior } }))
    expect(tela.text().split('ok')).toHaveLength(3)
  })

  test('código mostra o trecho e a linguagem', () => {
    const tela = bolha(mensagem({ conteudos: [texto('```sql\nselect 1\n```')] }))
    expect(tela.text()).toContain('select 1')
    expect(tela.text().toLowerCase()).toContain('sql')
  })

  test('chamada mostra o tipo e a duração', () => {
    const tela = bolha(mensagem({ conteudos: [conteudo(TipoConteudo.Chamada, JSON.stringify({ chamada_id: 1, tipo: 2, status: 4, duracao: 65, participantes: [] }))] }))
    expect(tela.text()).toMatch(/v[ií]deo/i)
    expect(tela.text()).toContain('01:05')
  })
})

describe('status, agendamento e reações', () => {
  test('minha mensagem enviando mostra o relógio; visualizada, os dois tiques em destaque', () => {
    const enviando = bolha(mensagem({ id: 5, enviando: true, conteudos: [texto('x')] }), { isOwn: true })
    expect(enviando.find('path[d^="M12 6v6h4.5"]').exists()).toBe(true)
    const vista = bolha(mensagem({ id: 6, visualizada: true, conteudos: [texto('x')] }), { isOwn: true })
    expect(vista.find('svg.text-primary-500').exists()).toBe(true)
  })

  test('mensagem de outra pessoa não mostra status', () => {
    expect(bolha(mensagem({ id: 5, conteudos: [texto('x')] })).find('svg.text-primary-500').exists()).toBe(false)
  })

  test('agendada para o futuro mostra o aviso só para o autor', () => {
    const futuro = new Date(Date.now() + 3600_000)
    expect(bolha(mensagem({ visivel_em: futuro, conteudos: [texto('x')] }), { isOwn: true }).text()).toContain('Agendada para')
    expect(bolha(mensagem({ visivel_em: new Date(Date.now() - 1000), conteudos: [texto('x')] }), { isOwn: true }).text()).not.toContain('Agendada para')
  })

  test('reações aparecem com a quantidade; clicar reage com o mesmo emoji', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], reacoes: [{ emoji: '👍', quantidade: 2, reagiu: true, usuarios: [{ usuario_id: 2, nome: 'Bruno', reagido_em: new Date() }] }] }))
    const botao = tela.find('button.reacao-btn')
    expect(botao.text()).toBe('👍2')
    expect(botao.classes()).toContain('reacao-reagiu')
    expect(tela.text()).toContain('Bruno')
    await botao.trigger('click')
    expect(tela.emitted('reagir')).toEqual([[9, '👍']])
  })

  test('mais de 5 emojis: os 5 primeiros à mostra e o resto no "+N", que também reage', async () => {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉']
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], reacoes: emojis.map((emoji) => ({ emoji, quantidade: 1, reagiu: false, usuarios: [] })) }))
    const pilulas = tela.findAll('button.reacao-btn')
    expect(pilulas.map((b) => b.text())).toEqual(['👍1', '❤️1', '😂1', '😮1', '😢1', '+2'])
    const extra = tela.findAll('button').find((b) => b.text().startsWith('🎉'))!
    expect(tela.findAll('button').some((b) => b.text().startsWith('🙏'))).toBe(true)
    await extra.trigger('click')
    expect(tela.emitted('reagir')).toEqual([[9, '🎉']])
  })
})

describe('postagem', () => {
  const resposta = (id: number, autor: string, frase: string, remetente_id = 2) => mensagem({ id, remetente_id, remetente: autor, conteudos: [texto(frase)] })
  const postagem = (extras: Partial<NonNullable<Mensagem['postagem']>> = {}) => mensagem({
    id: 30,
    conversa_id: 5,
    remetente: 'Ana',
    conteudos: [texto('Reunião amanhã às 9h')],
    postagem: { titulo: 'Aviso', respostas: 3, nao_lidas: 0, ultimas: [resposta(41, 'Bruno', 'Eu também'), resposta(42, 'Eu', 'Vou atrasar', 7)], ...extras },
  })

  test('cartão com título, conteúdo e as últimas respostas; "ver todas" busca o resto', async () => {
    rota('GET', '/postagem/respostas', [resposta(40, 'Carla', 'Estarei lá', 3), resposta(41, 'Bruno', 'Eu também'), resposta(42, 'Eu', 'Vou atrasar', 7)])
    const tela = bolha(postagem(), { isGroup: true })
    const cartao = tela.find('[data-postagem]')
    expect(cartao.find('h4').text()).toBe('Aviso')
    expect(cartao.text()).toContain('Reunião amanhã às 9h')
    expect(cartao.text()).toContain('3 respostas')
    expect(tela.findAll('[data-resposta]').map((r) => r.text())).toEqual([expect.stringContaining('Eu também'), expect.stringContaining('Você')])
    await tela.findAll('button').find((b) => b.text() === 'Ver todas as 3')!.trigger('click')
    await aguardar(5)
    expect(pedidosDe('GET', '/postagem/respostas')[0]!.consulta).toEqual({ id: '30' })
    expect(tela.findAll('[data-resposta]')).toHaveLength(3)
    expect(tela.text()).toContain('Estarei lá')
  })

  test('cada resposta mostra a foto de quem respondeu (sem foto, a inicial)', async () => {
    rota('GET', '/conversa/usuarios', [{ id: 1, usuario_id: 2, nome: 'Bruno', avatar_url: 'https://localhost/storage/bruno' }])
    const tela = bolha(postagem(), { isGroup: true })
    await aguardar(5)
    const [bruno, eu] = tela.findAll('[data-resposta]')
    expect(bruno!.find('img[data-avatar-resposta]').attributes('src')).toBe('https://localhost/storage/bruno')
    expect(eu!.find('img[data-avatar-resposta]').exists()).toBe(false)
    expect(eu!.text()).toContain('E')
  })

  test('"Responder à postagem" leva a resposta para o campo de mensagem', async () => {
    const tela = bolha(postagem({ respostas: 0, ultimas: [] }), { isGroup: true })
    expect(tela.text()).toContain('Nenhuma resposta ainda')
    await tela.find('[data-responder-postagem]').trigger('click')
    expect(useChatStore().postagemRespondendo?.id).toBe(30)
    expect(tela.find('[data-responder-postagem]').text()).toBe('Respondendo no campo de mensagem')
  })

  test('com a conversa aberta, respostas novas contam como vistas', async () => {
    rota('POST', '/postagem/visualizar', { vistas: 2 })
    rota('GET', '/conversas', [])
    useChatStore().conversaAtivaId = 5
    const tela = bolha(postagem({ nao_lidas: 2 }), { isGroup: true })
    expect(tela.text()).toContain('2 novas')
    await aguardar(5)
    expect(pedidosDe('POST', '/postagem/visualizar')[0]!.corpo).toEqual({ postagem_id: 30 })
  })
})

describe('mensagem da ligação', () => {
  const ligacao = (extras: Record<string, unknown> = {}) => mensagem({ id: 3, conversa_id: 1, conteudos: [{ ...conteudo(TipoConteudo.Chamada, JSON.stringify({ chamada_id: 9, tipo: 2, status: 4, duracao: 65, participantes: [] })), ...extras }] })

  test('com chat, expande as mensagens dentro dela; abrir leva ao chat', async () => {
    rota('GET', '/mensagens', [
      mensagem({ id: 1, remetente: 'Ana', conteudos: [texto('Oi @[Bruno](2)')] }),
      mensagem({ id: 2, remetente: 'Bruno', conteudos: [conteudo(TipoConteudo.Imagem, 'abc')] }),
    ])
    const tela = bolha(ligacao({ chat_chamada_id: 50 }))
    await tela.findAll('button').find((b) => b.text() === 'Ver chat da chamada')!.trigger('click')
    await aguardar(10)
    expect(pedidosDe('GET', '/mensagens')[0]!.consulta).toMatchObject({ conversa: '50' })
    const chat = tela.find('[data-chat-da-chamada]')
    expect(chat.text()).toContain('Oi')
    expect(chat.text()).toContain('Bruno')
    // Os conteúdos aparecem como no chat: a imagem é a imagem
    expect(chat.findAllComponents({ name: 'MessageContent' })).toHaveLength(2)
    expect(chat.find('img').exists()).toBe(true)
    const chatStore = useChatStore()
    let aberta = 0
    chatStore.selecionarConversa = (async (id: number) => { aberta = id }) as never
    await tela.findAll('button').find((b) => b.text() === 'Abrir o chat completo')!.trigger('click')
    expect(aberta).toBe(50)
  })

  test('sem chat (ou chat de quem não é membro), não oferece expandir', () => {
    expect(bolha(ligacao()).text()).not.toContain('Ver chat da chamada')
  })
})

describe('confirmação de leitura', () => {
  const destinatarios = [{ usuario_id: 2, nome: 'Bruno' }, { usuario_id: 3, nome: 'Carla' }]
  const confirmacao = (extras = {}) => ({ total: 2, confirmou: false, pode_confirmar: true, destinatarios, usuarios: [], ...extras })

  test('quem recebe vê a caixa; marcar pede a confirmação, sem marcar antes do servidor', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], confirmacao: confirmacao() }))
    const caixa = tela.find('input[type="checkbox"]')
    expect(tela.text()).toContain('Confirmar leitura')
    expect(tela.find('label span[aria-hidden="true"] svg').exists()).toBe(false)
    await caixa.setValue(true)
    expect(tela.emitted('confirmar-leitura')![0]![0]).toMatchObject({ id: 9 })
    expect((caixa.element as HTMLInputElement).checked).toBe(false)
  })

  test('já confirmada fica marcada e travada, com quem confirmou', () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], confirmacao: confirmacao({ confirmou: true, usuarios: [{ usuario_id: 7, nome: 'Eu', confirmada_em: new Date() }] }) }))
    const caixa = tela.find('input[type="checkbox"]').element as HTMLInputElement
    expect(caixa.checked).toBe(true)
    expect(caixa.disabled).toBe(true)
    expect(tela.text()).toContain('Leitura confirmada')
    // Caixa desenhada (a nativa some com a cor principal escura): preenchida e com o check
    expect(tela.find('label span[aria-hidden="true"]').classes()).toContain('bg-primary-600')
    expect(tela.find('label span[aria-hidden="true"] svg').exists()).toBe(true)
  })

  test('quem não está na lista não tem a caixa: vê só quantos confirmaram', () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], confirmacao: confirmacao({ pode_confirmar: false }) }))
    expect(tela.find('input[type="checkbox"]').exists()).toBe(false)
    expect(tela.text()).toContain('Aguardando confirmação')
  })

  test('quem enviou vê quantos confirmaram e quem falta, sem a caixa', () => {
    const aguardando = bolha(mensagem({ id: 9, conteudos: [texto('x')], confirmacao: confirmacao({ pode_confirmar: false }) }), { isOwn: true })
    expect(aguardando.find('input[type="checkbox"]').exists()).toBe(false)
    expect(aguardando.text()).toContain('Aguardando confirmação')
    const uma = bolha(mensagem({ id: 9, conteudos: [texto('x')], confirmacao: confirmacao({ pode_confirmar: false, usuarios: [{ usuario_id: 2, nome: 'Bruno', confirmada_em: new Date() }] }) }), { isOwn: true })
    expect(uma.text()).toContain('Confirmada por 1 de 2')
    expect(uma.text()).toContain('Bruno')
    expect(uma.findAll('[data-falta-confirmar]').map((d) => d.text())).toEqual(['Carla'])
  })

  test('mensagem comum não tem confirmação', () => {
    expect(bolha(mensagem({ id: 9, conteudos: [texto('x')] })).text()).not.toContain('Confirmar leitura')
  })
})

describe('menu de contexto', () => {
  const contextmenu = (tela: VueWrapper, extras: MouseEventInit = {}) =>
    tela.find('[class~="group/bubble"]').element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 200, ...extras }))
  const barraDeReacoes = () => document.querySelector<HTMLElement>('[role="menu"][aria-label="Reagir"]')
  const menuCompleto = () => [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Responder')

  test('Ctrl + clique direito: só os emojis, junto do clique; o meu já marcado; escolher reage', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], reacoes: [{ emoji: '❤️', quantidade: 1, reagiu: true, usuarios: [] }] }))
    contextmenu(tela, { ctrlKey: true })
    await tela.vm.$nextTick()
    const barra = barraDeReacoes()!
    expect(barra).not.toBeNull()
    expect(menuCompleto()).toBe(false)
    expect([...barra.querySelectorAll('button')].map((b) => b.textContent?.trim() || b.title)).toEqual(['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', 'Mais emojis'])
    expect(barra.querySelector('[title]')!.parentElement!.style.top).toBe(`${200 - 46 - 8}px`)
    expect([...barra.querySelectorAll('button')].find((b) => b.textContent?.trim() === '❤️')!.className).toContain('bg-primary-500/20')
    ;[...barra.querySelectorAll('button')].find((b) => b.textContent?.trim() === '😂')!.click()
    await tela.vm.$nextTick()
    expect(tela.emitted('reagir')).toEqual([[9, '😂']])
    expect(barraDeReacoes()).toBeNull()
  })

  test('"Pedir confirmação de leitura" só na minha mensagem, até 24 horas depois', async () => {
    const item = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Pedir confirmação de leitura')
    const recente = bolha(mensagem({ id: 9, conteudos: [texto('x')], inserida: new Date(Date.now() - 60_000) }), { isOwn: true })
    contextmenu(recente)
    await recente.vm.$nextTick()
    item()!.click()
    await recente.vm.$nextTick()
    expect(recente.emitted('pedir-confirmacao')![0]![0]).toMatchObject({ id: 9 })
    recente.unmount()
    for (const [extras, own] of [[{ inserida: new Date(Date.now() - 25 * 3600_000) }, true], [{}, false]] as const) {
      const tela = bolha(mensagem({ id: 10, conteudos: [texto('x')], ...extras }), { isOwn: own })
      contextmenu(tela)
      await tela.vm.$nextTick()
      expect(item()).toBeUndefined()
      tela.unmount()
    }
  })

  test('"Mais emojis" na barra rápida abre a lista completa; escolher reage', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')] }))
    contextmenu(tela, { ctrlKey: true })
    await tela.vm.$nextTick()
    barraDeReacoes()!.querySelector<HTMLElement>('button[title="Mais emojis"]')!.click()
    await tela.vm.$nextTick()
    expect(barraDeReacoes()).toBeNull()
    const lista = tela.findComponent({ name: 'EmojiPicker' })
    expect(lista.exists()).toBe(true)
    lista.vm.$emit('selecionar', '🎉')
    await tela.vm.$nextTick()
    expect(tela.emitted('reagir')).toEqual([[9, '🎉']])
    expect(tela.findComponent({ name: 'EmojiPicker' }).exists()).toBe(false)
  })

  test('clique direito sem Ctrl continua abrindo o menu completo', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')] }))
    contextmenu(tela)
    await tela.vm.$nextTick()
    expect(menuCompleto()).toBe(true)
    expect(barraDeReacoes()).toBeNull()
  })

  test('toque longo abre o menu completo; arrastar (rolar) não abre', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')] }))
    const alvo = tela.find('[class~="group/bubble"]').element
    const toque = (tipo: string, x = 100, y = 100) => alvo.dispatchEvent(new PointerEvent(tipo, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true }))
    toque('pointerdown')
    toque('pointermove', 100, 140)
    await new Promise((r) => setTimeout(r, 550))
    expect(menuCompleto()).toBe(false)

    toque('pointerdown')
    await new Promise((r) => setTimeout(r, 550))
    await tela.vm.$nextTick()
    expect(menuCompleto()).toBe(true)
    // O contextmenu que o Android manda depois não fecha nem troca o menu
    contextmenu(tela)
    toque('pointerup')
    document.body.click()
    await tela.vm.$nextTick()
    expect(menuCompleto()).toBe(true)
  })
})

describe('mensagem excluída', () => {
  const excluida = (extras: Partial<Mensagem> = {}) => mensagem({ id: 40, remetente: 'Bruno', excluida_em: new Date(), conteudos: [texto('conteúdo secreto')], ...extras })

  test('usa a bolha de excluída: sem o conteúdo, sem ações e sem reações', () => {
    const tela = bolha(excluida({ reacoes: [{ emoji: '👍', quantidade: 1, reagiu: false, usuarios: [] }] }))
    expect(tela.findComponent(BolhaExcluida).exists()).toBe(true)
    expect(tela.text()).toContain('Mensagem oculta')
    expect(tela.text()).not.toContain('conteúdo secreto')
    expect(tela.findComponent(MensagemAcoes).exists()).toBe(false)
    expect(tela.find('button.reacao-btn').exists()).toBe(false)
  })

  test('clique mostra o conteúdo e outro clique oculta; teclado também', async () => {
    const tela = bolha(excluida())
    const corpo = tela.findComponent(BolhaExcluida)
    expect(corpo.attributes('title')).toBe('Clique para ver o conteúdo')
    await corpo.trigger('click')
    expect(tela.text()).toContain('conteúdo secreto')
    expect(tela.text()).toContain('Mensagem oculta')
    expect(corpo.attributes('title')).toBe('Clique para ocultar o conteúdo')
    expect(corpo.attributes('aria-expanded')).toBe('true')
    await corpo.trigger('click')
    expect(tela.text()).not.toContain('conteúdo secreto')
    await corpo.trigger('keydown', { key: 'Enter' })
    expect(tela.text()).toContain('conteúdo secreto')
    await corpo.trigger('keydown', { key: ' ' })
    expect(tela.text()).not.toContain('conteúdo secreto')
  })

  test('com o conteúdo à mostra, clicar nos controles dele (ex.: baixar arquivo) não oculta', async () => {
    const tela = bolha(excluida({ conteudos: [conteudo(TipoConteudo.Arquivo, 'arq-1', { nome: 'contrato.xlsx' })] }))
    const corpo = tela.findComponent(BolhaExcluida)
    await corpo.trigger('click')
    const download = tela.findAll('button').find((b) => b.text() === 'Download')!
    await download.trigger('click')
    expect(tela.text()).toContain('contrato.xlsx')
    expect(tela.emitted('download')).toEqual([['arq-1', 'contrato.xlsx']])
  })

  test('em grupo mostra quem enviou; a minha continua com os tiques de entrega', () => {
    expect(bolha(excluida(), { isGroup: true }).text()).toContain('Bruno')
    const minha = bolha(excluida({ remetente: 'Eu', visualizada: true }), { isOwn: true })
    expect(minha.find('svg.text-primary-500').exists()).toBe(true)
  })

  test('a resposta a uma mensagem excluída não mostra o conteúdo citado', () => {
    const resposta = mensagem({ conteudos: [texto('concordo')], mensagem_referencia: { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: 99, remetente: 'Bruno', excluida_em: new Date(), conteudos: [texto('o que foi dito')] } } })
    const tela = bolha(resposta)
    expect(tela.text()).toContain('Mensagem oculta')
    expect(tela.text()).not.toContain('o que foi dito')
    expect(tela.text()).toContain('concordo')
  })
})
