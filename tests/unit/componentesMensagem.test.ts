import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MensagemAcoes from '@/components/MensagemAcoes.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import MencaoDropdown from '@/components/MencaoDropdown.vue'
import MencaoLink from '@/components/MencaoLink.vue'
import SeletorOpcoes from '@/components/SeletorOpcoes.vue'
import UploadIndicador from '@/components/UploadIndicador.vue'
import ReferenciaRecursiva from '@/components/ReferenciaRecursiva.vue'
import DetalheStatusMensagem from '@/components/DetalheStatusMensagem.vue'
import PesquisaAvancada from '@/components/PesquisaAvancada.vue'
import TranscricaoAudio from '@/components/TranscricaoAudio.vue'
import FilaArquivosPreview from '@/components/FilaArquivosPreview.vue'
import { useChatStore } from '@/stores/chat'
import { useUploadProgress } from '@/composables/useUploadProgress'
import { StatusTranscricao, TipoConteudo, TipoConversa, TipoMensagemReferencia, type Contato, type Conversa, type MensagemReferencia } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { conteudo, mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
const botao = (tela: VueWrapper | DOMWrapper<Element>, textoBotao: string) => tela.findAll('button').find((b) => b.text() === textoBotao)!
const contato = (id: number, nome: string, extras: Partial<Contato> = {}): Contato => ({ id, nome, login: nome.toLowerCase(), email: `${nome.toLowerCase()}@t`, ...extras } as Contato)
const conversa = (id: number, extras: Partial<Conversa> = {}): Conversa => ({ id, descricao: `Conversa ${id}`, tipo: TipoConversa.Direta, inserida: new Date(), ...extras } as Conversa)

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('ações da mensagem', () => {
  function acoes(props: object = {}) {
    return montar(MensagemAcoes, { props: { mensagem: mensagem({ id: 5 }), ...props } })
  }
  async function abrir(tela: VueWrapper) {
    await tela.find('button').trigger('click')
  }
  // O menu e o seletor vão para o body (Teleport), fora do componente
  const corpo = () => new DOMWrapper(document.body)

  test('abrir o menu avisa; cada ação fecha o menu e emite com a mensagem', async () => {
    const tela = acoes()
    await abrir(tela)
    expect(tela.emitted('menu-toggle')).toEqual([[true]])
    for (const acao of ['Responder', 'Encaminhar', 'Copiar']) {
      await botao(corpo(), acao).trigger('click')
      expect(corpo().text()).not.toContain(acao)
      await abrir(tela)
    }
    expect((tela.emitted('reply') as unknown[][])[0]![0]).toMatchObject({ id: 5 })
    expect((tela.emitted('forward') as unknown[][])[0]![0]).toMatchObject({ id: 5 })
    expect(tela.emitted('copiar')![0]).toEqual([expect.objectContaining({ id: 5 }), null])
  })

  test('o menu vai para o body, fora da lista (que isola o empilhamento e o deixava por trás da caixa de mensagem)', async () => {
    const tela = acoes()
    await abrir(tela)
    const menu = corpo().find('div.fixed')
    expect(menu.element.parentElement).toBe(document.body)
    expect(tela.element.contains(menu.element)).toBe(false)
    // Clicar dentro do menu (fora dos botões) não fecha
    await menu.trigger('click')
    menu.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tela.vm.$nextTick()
    expect(corpo().find('div.fixed').exists()).toBe(true)
  })

  test('clicar de novo no botão fecha', async () => {
    const tela = acoes()
    await abrir(tela)
    await abrir(tela)
    expect(tela.emitted('menu-toggle')).toEqual([[true], [false]])
  })

  test('emoji rápido reage; o seletor completo também', async () => {
    const tela = acoes()
    await abrir(tela)
    await corpo().findAll('.grid-cols-4 button').find((b) => b.text() === '👍')!.trigger('click')
    expect(tela.emitted('reagir')).toEqual([['👍']])
    await abrir(tela)
    await corpo().find('button[title="Mais emojis"]').trigger('click')
    expect(tela.findComponent(EmojiPicker).exists()).toBe(true)
    tela.findComponent(EmojiPicker).vm.$emit('selecionar', '🎉')
    await tela.vm.$nextTick()
    expect(tela.emitted('reagir')).toEqual([['👍'], ['🎉']])
    expect(tela.findComponent(EmojiPicker).exists()).toBe(false)
  })

  test('fechar o seletor volta ao menu', async () => {
    const tela = acoes()
    await abrir(tela)
    await corpo().find('button[title="Mais emojis"]').trigger('click')
    tela.findComponent(EmojiPicker).vm.$emit('close')
    await tela.vm.$nextTick()
    expect(corpo().text()).toContain('Responder')
  })

  test('Responder no privado só em grupo e para mensagem de outra pessoa', async () => {
    const grupo = acoes({ isGroup: true })
    await abrir(grupo)
    await botao(corpo(), 'Responder no privado').trigger('click')
    expect(grupo.emitted('responder-privado')).toHaveLength(1)
    const minha = acoes({ isGroup: true, isOwn: true })
    await abrir(minha)
    expect(corpo().text()).not.toContain('Responder no privado')
  })

  test('Excluir em qualquer mensagem minha, a qualquer momento; nunca na dos outros', async () => {
    for (const extras of [{}, { visivel_em: new Date(Date.now() + 60_000) }, { inserida: new Date(2020, 0, 1) }]) {
      const minha = acoes({ isOwn: true, mensagem: mensagem({ id: 5, ...extras }) })
      await abrir(minha)
      await botao(corpo(), 'Excluir').trigger('click')
      expect(minha.emitted('excluir')).toHaveLength(1)
    }
    const deOutro = acoes({ isOwn: false })
    await abrir(deOutro)
    expect(corpo().text()).not.toContain('Excluir')
  })

  test('já excluída não oferece Excluir de novo', async () => {
    const tela = acoes({ isOwn: true, mensagem: mensagem({ id: 5, excluida_em: new Date() }) })
    await abrir(tela)
    expect(corpo().text()).not.toContain('Excluir')
  })

  test('abrir um menu fecha o de outra mensagem; clique fora também fecha', async () => {
    const a = acoes()
    const b = montar(MensagemAcoes, { props: { mensagem: mensagem({ id: 6 }) } })
    await abrir(a)
    await abrir(b)
    // Só um menu aberto na página: o da segunda
    expect(corpo().findAll('div.fixed').filter((m) => m.text().includes('Responder'))).toHaveLength(1)
    expect(a.emitted('menu-toggle')).toEqual([[true], [false]])
    expect(b.emitted('menu-toggle')).toEqual([[true]])
    document.body.click()
    await b.vm.$nextTick()
    expect(corpo().text()).not.toContain('Responder')
  })

  test('pelo clique direito, Copiar leva o conteúdo clicado', async () => {
    const tela = acoes()
    const alvo = { tipo: 'imagem', identificador: 'img-1' }
    ;(tela.vm as unknown as { abrirViaContextMenu: (a: unknown) => void }).abrirViaContextMenu(alvo)
    await tela.vm.$nextTick()
    await botao(corpo(), 'Copiar').trigger('click')
    expect(tela.emitted('copiar')![0]![1]).toEqual(alvo)
  })

  test('menu e seletor não saem da tela: minha mensagem alinha pela direita, e sobem quando não cabem embaixo', async () => {
    const tela = acoes({ isOwn: true })
    const el = tela.element as HTMLElement
    const alto = window.innerHeight
    el.getBoundingClientRect = () => ({ top: alto - 20, bottom: alto - 10, left: 5, right: 100, width: 95, height: 10, x: 5, y: 0, toJSON: () => ({}) })
    await abrir(tela)
    expect(parseFloat((corpo().find('div.fixed').element as HTMLElement).style.left)).toBe(8)
    // O seletor tem altura fixa (310): não cabe embaixo, abre acima do botão
    await corpo().find('button[title="Mais emojis"]').trigger('click')
    expect(parseFloat((corpo().find('div.fixed').element as HTMLElement).style.top)).toBe(alto - 20 - 310 - 4)
  })

  test('mensagem de outra pessoa alinha pela esquerda, limitada à largura da tela', async () => {
    const tela = acoes()
    ;(tela.element as HTMLElement).getBoundingClientRect = () => ({ top: 10, bottom: 30, left: window.innerWidth - 50, right: window.innerWidth, width: 50, height: 20, x: 0, y: 10, toJSON: () => ({}) })
    await abrir(tela)
    const estilo = (corpo().find('div.fixed').element as HTMLElement).style
    expect(parseFloat(estilo.left)).toBe(window.innerWidth - 200 - 8)
    expect(parseFloat(estilo.top)).toBe(34)
  })

  test('rolar a lista fecha o menu e acompanha a bolha', async () => {
    const lista = document.createElement('div')
    lista.style.overflowY = 'auto'
    const bolha = document.createElement('div')
    lista.appendChild(bolha)
    document.body.appendChild(lista)
    const tela = mount(MensagemAcoes, { props: { mensagem: mensagem() }, attachTo: bolha })
    montados.push(tela)
    // A bolha é o elemento em volta das ações
    tela.element.parentElement!.getBoundingClientRect = () => ({ top: -100, bottom: 200, left: 0, right: 100, width: 100, height: 300, x: 0, y: -100, toJSON: () => ({}) })
    await abrir(tela)
    lista.dispatchEvent(new Event('scroll'))
    await tela.vm.$nextTick()
    expect(corpo().text()).not.toContain('Responder')
    expect((tela.find('div.absolute').element as HTMLElement).style.top).toBe('128px')
  })
})

describe('seletor de emoji', () => {
  test('categorias com nomes em português; escolher emite', async () => {
    const tela = montar(EmojiPicker)
    expect(tela.text()).toContain('Populares')
    expect(tela.text()).toContain('Objetos')
    const joia = tela.findAll('button').find((b) => b.text() === '👍')!
    expect(joia.attributes('title')).toBeTruthy()
    await joia.trigger('click')
    expect(tela.emitted('selecionar')![0]).toEqual(['👍'])
  })

  test('posição conforme as props; estático sem posição', () => {
    expect(montar(EmojiPicker, { props: { alinhamento: 'right', direcao: 'cima' } }).classes()).toEqual(expect.arrayContaining(['right-0', 'bottom-full']))
    expect(montar(EmojiPicker).classes()).toEqual(expect.arrayContaining(['left-0', 'top-full']))
    expect(montar(EmojiPicker, { props: { estatico: true } }).classes()).not.toContain('absolute')
  })

  test('clique fora fecha (depois de aberto)', async () => {
    const tela = montar(EmojiPicker)
    await aguardar(5)
    document.body.click()
    tela.find('button').element.click()
    expect(tela.emitted('close')).toHaveLength(1)
  })
})

describe('menções', () => {
  function lista(termo: string) {
    const chat = useChatStore()
    chat.contatos = [contato(2, 'Bruno'), contato(3, 'Carla'), contato(4, 'Davi'), contato(5, 'Eva'), contato(6, 'Fábio'), contato(8, 'Gil'), contato(9, 'Hugo'), contato(7, 'Eu')]
    chat.conversas = [conversa(1, { destinatario_id: 3, avatar_url: 'https://localhost/storage/carla' })]
    return montar(MencaoDropdown, { props: { termo } })
  }

  test('no máximo 6 contatos; filtra por nome ou login', async () => {
    const tela = lista('')
    expect(tela.findAll('button')).toHaveLength(6)
    await tela.setProps({ termo: 'car' })
    expect(tela.findAll('button').map((b) => b.find('span').text())).toEqual(['Carla'])
    expect(tela.find('img').attributes('src')).toBe('https://localhost/storage/carla')
    await tela.setProps({ termo: 'ninguem' })
    expect(tela.html()).not.toContain('button')
  })

  test('setas movem (dando a volta) e confirmar escolhe o ativo', async () => {
    const tela = lista('')
    const exposto = tela.vm as unknown as { mover: (d: number) => void; confirmar: () => void }
    exposto.mover(-1)
    await tela.vm.$nextTick()
    expect(tela.findAll('button')[5]!.classes()).toContain('bg-surface-200')
    exposto.mover(1)
    exposto.confirmar()
    expect((tela.emitted('selecionar')![0]![0] as Contato).nome).toBe('Bruno')
  })

  test('mouse marca e clique escolhe', async () => {
    const tela = lista('')
    await tela.findAll('button')[2]!.trigger('mouseenter')
    expect(tela.findAll('button')[2]!.classes()).toContain('bg-surface-200')
    await tela.findAll('button')[2]!.trigger('mousedown')
    expect((tela.emitted('selecionar')![0]![0] as Contato).nome).toBe('Davi')
  })

  test('link da menção: mostra o contato ao passar o mouse e abre a conversa ao clicar', async () => {
    rota('GET', '/mensagens', [])
    const chat = useChatStore()
    chat.contatos = [contato(2, 'Bruno')]
    chat.conversas = [conversa(9, { destinatario_id: 2, avatar_url: 'https://localhost/storage/b' })]
    const tela = montar(MencaoLink, { props: { nome: 'Bruno', usuarioId: 2 } })
    expect(tela.text()).toBe('@Bruno')
    await tela.find('button').trigger('mouseenter')
    expect(tela.find('img').attributes('src')).toBe('https://localhost/storage/b')
    await tela.find('button').trigger('mouseleave')
    expect(tela.find('img').exists()).toBe(false)
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(chat.conversaAtivaId).toBe(9)
  })

  test('menção de quem não é contato não abre nada', async () => {
    const tela = montar(MencaoLink, { props: { nome: 'Fulano', usuarioId: 99, isOwn: true } })
    await tela.find('button').trigger('mouseenter')
    await tela.find('button').trigger('click')
    expect(tela.find('img').exists()).toBe(false)
    expect(useChatStore().conversaAtivaId).toBeNull()
    expect(tela.find('button').classes()).toContain('text-white/90')
  })
})

describe('seletor de opções', () => {
  test('marca a atual e emite a escolhida', async () => {
    const tela = montar(SeletorOpcoes, { props: { modelValue: 'b', opcoes: [{ valor: 'a', titulo: 'A' }, { valor: 'b', titulo: 'B' }] } })
    expect(botao(tela, 'B').classes()).toContain('bg-primary-600')
    await botao(tela, 'A').trigger('click')
    expect(tela.emitted('update:modelValue')).toEqual([['a']])
  })
})

describe('indicador de envio', () => {
  test('aparece só se o envio passar de 2 segundos abaixo de 50%', async () => {
    const relogio = relogioFalso()
    const envios = useUploadProgress()
    try {
      const tela = montar(UploadIndicador)
      const progresso = envios.iniciarUpload('a', 'video.mp4')
      progresso(30)
      relogio.avancar(1999)
      await tela.vm.$nextTick()
      expect(tela.text()).toBe('')
      relogio.avancar(1)
      await tela.vm.$nextTick()
      expect(tela.text()).toContain('video.mp4')
      expect(tela.text()).toContain('30%')
      expect((tela.find('.bg-primary-600').element as HTMLElement).style.width).toBe('30%')
      envios.finalizarUpload('a')
      await tela.vm.$nextTick()
      expect(tela.text()).toBe('')
      const rapido = envios.iniciarUpload('b', 'rapido.png')
      rapido(80)
      relogio.avancar(2000)
      await tela.vm.$nextTick()
      expect(tela.text()).toBe('')
    } finally {
      envios.limparTodos()
      relogio.restaurar()
    }
  })
})

describe('referência (resposta e encaminhada)', () => {
  const url = (id: string) => `https://localhost/storage/${id}`

  test('resposta: título, hora e conteúdo; clicar vai à mensagem', async () => {
    const referencia: MensagemReferencia = { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: 40, remetente: 'Bruno', conversa_id: 1, inserida: new Date(2026, 0, 1, 9, 5), conteudos: [texto('Vamos?')] } }
    const tela = montar(ReferenciaRecursiva, { props: { referencia, isOwn: false, getAnexoUrl: url } })
    expect(tela.text()).toContain('Bruno')
    expect(tela.text()).toContain('09:05')
    expect(tela.text()).toContain('Vamos?')
    await tela.find('span').trigger('click')
    expect(tela.emitted('go-to-message')).toEqual([[40, 1]])
  })

  test('encaminhada só navega se eu participo da conversa de origem', async () => {
    const referencia: MensagemReferencia = { tipo: TipoMensagemReferencia.Encaminhada, mensagem: { id: 40, remetente: 'Bruno', conversa_id: 3, conteudos: [texto('x')] } }
    const tela = montar(ReferenciaRecursiva, { props: { referencia, isOwn: true, getAnexoUrl: url } })
    expect(tela.text()).toContain('Encaminhado de Bruno')
    await tela.find('span').trigger('click')
    expect(tela.emitted('go-to-message')).toBeUndefined()
    useChatStore().conversas = [conversa(3)]
    await tela.vm.$nextTick()
    await tela.find('span').trigger('click')
    expect(tela.emitted('go-to-message')).toEqual([[40, 3]])
  })

  test('encadeada até 5 níveis e repassa os eventos dos níveis de dentro', async () => {
    let atual: MensagemReferencia | undefined
    for (let nivel = 8; nivel >= 1; nivel--) {
      atual = { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: nivel, remetente: `N${nivel}`, conteudos: [texto(`nível ${nivel}`)], ...(atual ? { mensagem_referencia: atual } : {}) } }
    }
    const tela = montar(ReferenciaRecursiva, { props: { referencia: atual!, isOwn: false, getAnexoUrl: url } })
    expect(tela.text()).toContain('nível 6')
    expect(tela.text()).not.toContain('nível 7')
    const internas = tela.findAllComponents(ReferenciaRecursiva)
    await internas.at(-1)!.find('span').trigger('click')
    expect(tela.emitted('go-to-message')).toEqual([[6, undefined]])
    internas.at(-1)!.vm.$emit('download', 'a', 'b.txt')
    internas.at(-1)!.vm.$emit('open-image', 'c', 'd.png')
    internas.at(-1)!.vm.$emit('image-loaded')
    expect(tela.emitted('download')).toEqual([['a', 'b.txt']])
    expect(tela.emitted('open-image')).toEqual([['c', 'd.png']])
    expect(tela.emitted('image-loaded')).toHaveLength(1)
  })
})

describe('detalhe do status da mensagem', () => {
  const hoje = new Date()
  hoje.setHours(10, 15, 0, 0)
  const outroDia = new Date(2026, 1, 3, 8, 0)

  test('conversa direta: cada etapa com horário; áudio mostra Ouvida', async () => {
    rota('GET', '/mensagem/status/detalhe', [{ usuario_id: 2, nome: 'Bruno', recebida: hoje.toISOString(), visualizada: outroDia.toISOString(), reproduzida: null }])
    const tela = montar(DetalheStatusMensagem, { props: { mensagem: mensagem({ id: 5, inserida: hoje, conteudos: [conteudo(TipoConteudo.Audio, 'a')] }), isGroup: false } })
    expect(tela.text()).toContain('Carregando...')
    await aguardar(10)
    expect(pedidosDe('GET', '/mensagem/status/detalhe')[0]!.consulta).toEqual({ id: '5' })
    const etapas = tela.findAll('li').map((li) => li.text())
    expect(etapas).toEqual(['Enviada10:15', 'Recebida10:15', 'Visualizada03/02 08:00', 'OuvidaAguardando'])
  })

  test('grupo: separa quem viu, quem só recebeu e quem aguarda', async () => {
    rota('GET', '/mensagem/status/detalhe', [
      { usuario_id: 2, nome: 'Bruno', recebida: hoje.toISOString(), visualizada: hoje.toISOString(), reproduzida: null },
      { usuario_id: 3, nome: 'Carla', recebida: hoje.toISOString(), visualizada: null, reproduzida: null },
      { usuario_id: 4, nome: 'Davi', recebida: null, visualizada: null, reproduzida: null },
    ])
    const tela = montar(DetalheStatusMensagem, { props: { mensagem: mensagem({ conteudos: [texto('x')] }), isGroup: true } })
    await aguardar(10)
    expect(tela.text()).toContain('Visualizada por (1)Bruno10:15')
    expect(tela.text()).toContain('Recebida por (1)Carla10:15')
    expect(tela.text()).toContain('Aguardando (1)Davi')
  })

  test('excluída mostra quando foi excluída, na conversa direta e no grupo', async () => {
    rota('GET', '/mensagem/status/detalhe', [{ usuario_id: 2, nome: 'Bruno', recebida: hoje.toISOString(), visualizada: null, reproduzida: null }])
    const direta = montar(DetalheStatusMensagem, { props: { mensagem: mensagem({ inserida: hoje, excluida_em: hoje, conteudos: [texto('x')] }), isGroup: false } })
    const grupo = montar(DetalheStatusMensagem, { props: { mensagem: mensagem({ inserida: hoje, excluida_em: hoje, conteudos: [texto('x')] }), isGroup: true } })
    await aguardar(10)
    expect(direta.findAll('li').map((li) => li.text()).at(-1)).toBe('Excluída10:15')
    expect(grupo.text()).toContain('Excluída10:15')
  })

  test('erro ao carregar avisa', async () => {
    rota('GET', '/mensagem/status/detalhe', erro(403, 'x'))
    const tela = montar(DetalheStatusMensagem, { props: { mensagem: mensagem(), isGroup: false } })
    await aguardar(10)
    expect(tela.text()).toBe('Não foi possível carregar o status.')
  })
})

describe('pesquisa em todos os chats', () => {
  const resultados = [
    mensagem({ id: 1, conversa_id: 1, remetente: 'Bruno', inserida: new Date(2026, 2, 4, 9, 7), conteudos: [texto('reunião amanhã')] }),
    mensagem({ id: 2, conversa_id: 1, remetente: 'Carla', conteudos: [texto('Reunião adiada')] }),
    mensagem({ id: 3, conversa_id: 8, remetente: 'Davi', conteudos: [texto('sem reunião (hoje)')] }),
  ]

  test('com termo inicial já pesquisa; agrupa por conversa e destaca o termo', async () => {
    rota('GET', '/pesquisar', resultados)
    useChatStore().conversas = [conversa(1, { descricao: 'Equipe' })]
    const tela = montar(PesquisaAvancada, { props: { termoInicial: 'reunião' } })
    await aguardar(10)
    expect(pedidosDe('GET', '/pesquisar')[0]!.consulta).toEqual({ texto: 'reunião', conversa: '0' })
    const grupos = tela.findAll('.border-b.border-surface-300')
    expect(grupos.map((g) => g.find('span').text())).toEqual(['Equipe', 'Conversa #8'])
    expect(grupos[0]!.text()).toContain('04/03/26 09:07')
    expect(tela.findAll('mark').map((m) => m.text())).toEqual(['reunião', 'Reunião', 'reunião'])
    await grupos[1]!.find('button').trigger('click')
    expect(tela.emitted('open-message')).toEqual([[8, 3]])
  })

  test('Enter pesquisa; termo com caracteres especiais é literal; sem resultado avisa', async () => {
    rota('GET', '/pesquisar', [])
    const tela = montar(PesquisaAvancada)
    await tela.vm.$nextTick()
    expect(document.activeElement).toBe(tela.find('input').element)
    await tela.find('input').trigger('keyup', { key: 'Enter' })
    expect(pedidosDe('GET', '/pesquisar')).toHaveLength(0)
    await tela.find('input').setValue('(hoje)')
    await tela.find('input').trigger('keyup', { key: 'Enter' })
    await aguardar(10)
    expect(tela.text()).toContain('Nenhum resultado encontrado.')
    rota('GET', '/pesquisar', resultados)
    await tela.find('input').trigger('keyup', { key: 'Enter' })
    await aguardar(10)
    expect(tela.findAll('mark').map((m) => m.text())).toEqual(['(hoje)'])
  })

  test('Cancelar limpa os resultados e fecha', async () => {
    rota('GET', '/pesquisar', resultados)
    const tela = montar(PesquisaAvancada, { props: { termoInicial: 'x' } })
    await aguardar(10)
    await tela.find('button[title="Cancelar"]').trigger('click')
    expect(useChatStore().resultadosBuscaGlobal).toEqual([])
    expect(tela.emitted('close')).toHaveLength(1)
  })
})

describe('transcrição de áudio', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => relogio.restaurar())

  test('pedir a transcrição; acompanha até concluir', async () => {
    rota('PUT', '/anexo/transcricao', { status: StatusTranscricao.Processando, texto: '', erro: '' })
    const tela = montar(TranscricaoAudio, { props: { identificador: 'aud-1' } })
    await botao(tela, 'Transcrever').trigger('click')
    await aguardar(5)
    expect(pedidosDe('PUT', '/anexo/transcricao')[0]!.corpo).toEqual({ identificador: 'aud-1' })
    expect(tela.text()).toContain('Transcrevendo...')
    rota('GET', '/anexo/transcricao', { status: StatusTranscricao.Concluida, texto: 'Olá, tudo bem?', erro: '' })
    relogio.avancar(3000)
    await aguardar(5)
    expect(tela.text()).toBe('Olá, tudo bem?')
    relogio.avancar(9000)
    await aguardar(5)
    expect(pedidosDe('GET', '/anexo/transcricao')).toHaveLength(1)
  })

  test('já processando ao abrir continua acompanhando; falha de consulta tenta de novo', async () => {
    const tela = montar(TranscricaoAudio, { props: { identificador: 'aud-1', statusInicial: StatusTranscricao.Processando } })
    relogio.avancar(3000)
    await aguardar(5)
    expect(tela.text()).toContain('Transcrevendo...')
    rota('GET', '/anexo/transcricao', { status: StatusTranscricao.Concluida, texto: '', erro: '' })
    relogio.avancar(3000)
    await aguardar(5)
    expect(tela.text()).toBe('(nenhuma fala reconhecida)')
  })

  test('erro do transcritor permite tentar de novo; erro do pedido aparece', async () => {
    const tela = montar(TranscricaoAudio, { props: { identificador: 'aud-1', statusInicial: StatusTranscricao.Erro } })
    expect(tela.text()).toContain('Não foi possível transcrever. Tentar de novo')
    rota('PUT', '/anexo/transcricao', { status: StatusTranscricao.Erro, texto: '', erro: 'Transcritor fora do ar' })
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(tela.text()).toContain('Transcritor fora do ar')
    rota('PUT', '/anexo/transcricao', erro(400, 'Anexo não é áudio'))
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(tela.text()).toContain('Anexo não é áudio')
  })

  test('com texto pronto, só mostra o texto', () => {
    const tela = montar(TranscricaoAudio, { props: { identificador: 'a', statusInicial: StatusTranscricao.Concluida, textoInicial: 'pronto' } })
    expect(tela.text()).toBe('pronto')
  })

  test('fechar para de consultar', async () => {
    const tela = montar(TranscricaoAudio, { props: { identificador: 'aud-1', statusInicial: StatusTranscricao.Processando } })
    tela.unmount()
    montados.splice(montados.indexOf(tela), 1)
    relogio.avancar(10_000)
    await aguardar(5)
    expect(pedidosDe('GET', '/anexo/transcricao')).toHaveLength(0)
  })
})

describe('fila de arquivos para enviar', () => {
  const arquivo = (id: string, extras: object) => ({ id, file: new Blob(['x'.repeat(2048)]), nome: `${id}.bin`, tipo: 'application/octet-stream', isAudio: false, ...extras })

  test('imagens em miniatura, arquivos e áudios em lista, com tamanho e duração', async () => {
    const tela = montar(FilaArquivosPreview, { props: { arquivos: [
      arquivo('foto', { isImagem: true, previewUrl: 'blob:foto', nome: 'foto.png' }),
      arquivo('doc', { nome: 'doc.pdf' }),
      arquivo('audio', { isAudio: true, nome: 'gravacao.webm', duracaoSegundos: 75, reproduzindo: true }),
    ] } })
    expect(tela.find('img').attributes('src')).toBe('blob:foto')
    expect(tela.text()).toContain('doc.pdf')
    expect(tela.text()).toContain('2.0 KB')
    expect(tela.text()).toContain('01:15')
    expect(tela.find('button[title="Pausar"]').exists()).toBe(true)
    await tela.find('img').trigger('click')
    await tela.find('button[title="Pausar"]').trigger('click')
    const remover = tela.findAll('button[title="Remover"]')
    expect(remover).toHaveLength(3)
    await remover[0]!.trigger('click')
    await remover[1]!.trigger('click')
    expect(tela.emitted('abrir-imagem')).toEqual([['foto']])
    expect(tela.emitted('alternar-preview')).toEqual([['audio']])
    expect(tela.emitted('remover')).toEqual([['foto'], ['doc']])
  })

  test('um arquivo só ocupa a linha toda; vazia não mostra nada', async () => {
    const tela = montar(FilaArquivosPreview, { props: { arquivos: [arquivo('doc', { isAudio: true, reproduzindo: false })] } })
    expect(tela.find('.grid').classes()).toContain('grid-cols-1')
    expect(tela.find('button[title="Ouvir"]').exists()).toBe(true)
    await tela.setProps({ arquivos: [] })
    expect(tela.text()).toBe('')
  })
})
