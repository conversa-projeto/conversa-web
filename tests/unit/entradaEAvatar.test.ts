import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageInput from '@/components/MessageInput.vue'
import CodigoModal from '@/components/CodigoModal.vue'
import MencaoDropdown from '@/components/MencaoDropdown.vue'
import CallBar from '@/components/CallBar.vue'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useChatStore } from '@/stores/chat'
import { TipoConversa } from '@/types/api'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { instalarWebrtcFalso } from './webrtcFalso'
import { relogioFalso } from './relogioFalso'
import { useRecursos } from '@/composables/useRecursos'
import { usePreferenciaSugestoes } from '@/composables/useSugestaoIa'

const montados: VueWrapper[] = []
beforeEach(() => {
  instalarWebrtcFalso()
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu Mesmo', avatar_identificador: 'meu-avatar' }))
  setActivePinia(createPinia())
})
afterEach(() => montados.splice(0).forEach((w) => w.unmount()))

describe('indicador de digitando e gravando', () => {
  const contatos = [{ id: 2, nome: 'Bruno' }, { id: 3, nome: 'Carla' }, { id: 4, nome: 'Davi' }, { id: 5, nome: 'Eva' }, { id: 6, nome: 'Fábio' }]

  function montarCampo(tipo: TipoConversa, digitando: number[], chatNoFim = true) {
    const chat = useChatStore()
    chat.contatos = contatos as never
    chat.conversas = [{ id: 1, descricao: 'x', tipo, inserida: new Date() }]
    chat.conversaAtivaId = 1
    chat.digitandoPorConversa = new Map(digitando.length ? [[1, new Map(digitando.map((id) => [id, 0]))]] : [])
    const campo = mount(MessageInput, { props: { chatNoFim }, attachTo: document.body })
    montados.push(campo)
    return campo
  }

  test('a linha fica dentro da barra do campo, encostada nele', async () => {
    const campo = montarCampo(TipoConversa.Direta, [2])
    await aguardar()
    const linha = campo.find('.indicador-atividade')
    expect(linha.exists()).toBe(true)
    // O pai da linha é a barra que contém a caixa de texto (não o bloco com anexos e resposta)
    expect(linha.element.parentElement!.querySelector('[contenteditable="true"]')).not.toBeNull()
    expect(linha.classes()).toEqual(expect.arrayContaining(['absolute', 'bottom-full']))
  })

  test('a etiqueta fica acima de todo o bloco, para não cobrir anexos nem a resposta', () => {
    const campo = montarCampo(TipoConversa.Direta, [2])
    const etiqueta = campo.findAll('div').find((d) => d.attributes('style')?.includes('bottom: calc(100% + 2px)'))!
    expect(etiqueta.element.parentElement!.classList.contains('max-w-[850px]')).toBe(true)
    expect(etiqueta.text()).toBe('Digitando...')
  })

  test('longe do fim do chat, só a linha aparece', () => {
    const campo = montarCampo(TipoConversa.Direta, [2], false)
    expect(campo.find('.indicador-atividade').exists()).toBe(true)
    expect(campo.text()).not.toContain('Digitando...')
  })

  test.each([
    [[2], 'Bruno está digitando...'],
    [[2, 3], 'Bruno e Carla estão digitando...'],
    [[2, 3, 4], 'Bruno, Carla e Davi estão digitando...'],
    [[2, 3, 4, 5, 6], 'Bruno, Carla, Davi e outras 2 pessoas estão digitando...'],
  ])('em grupo, diz quem está digitando (%p)', (ids, texto) => {
    expect(montarCampo(TipoConversa.Grupo, ids).text()).toContain(texto)
  })

  test('sem ninguém digitando, não mostra nada', () => {
    const campo = montarCampo(TipoConversa.Direta, [])
    expect(campo.find('.indicador-atividade').exists()).toBe(false)
  })
})

// O campo é um editor (Tiptap), criado logo depois de montar
async function montarCampo(tipo: TipoConversa = TipoConversa.Direta) {
  const chat = useChatStore()
  chat.conversas = [{ id: 1, descricao: 'x', tipo, inserida: new Date() }]
  chat.conversaAtivaId = 1
  const campo = mount(MessageInput, { props: { chatNoFim: true }, attachTo: document.body })
  montados.push(campo)
  await aguardar()
  return campo
}

const editavel = (campo: VueWrapper) => campo.find('[contenteditable="true"]').element as HTMLElement

// Texto do campo como o editor o guarda: parágrafos e quebras de linha
function textoDoCampo(campo: VueWrapper) {
  return [...editavel(campo).children].map((bloco) => bloco.tagName === 'P'
    ? [...bloco.childNodes].filter((no) => !(no instanceof HTMLElement && (no.classList.contains('ProseMirror-trailingBreak') || no.hasAttribute('data-sugestao'))))
      .map((no) => (no.nodeName === 'BR' ? '\n' : no.textContent)).join('')
    : '').join('\n').replace(/\n+$/, '')
}

function colarNo(campo: VueWrapper, dados: { texto?: string; html?: string; arquivos?: File[] }) {
  const el = editavel(campo)
  el.focus()
  const evento = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(evento, 'clipboardData', { value: { files: dados.arquivos ?? [], types: [], getData: (tipo: string) => (tipo === 'text/html' ? dados.html ?? dados.texto ?? '' : dados.texto ?? '') } })
  el.dispatchEvent(evento)
  return evento
}

// "Digitar" no campo: entra no ponto do cursor, como o que se cola
const digitar = (campo: VueWrapper, texto: string) => colarNo(campo, { texto })

const teclar = (campo: VueWrapper, key: string, extras: KeyboardEventInit = {}) => {
  const tecla = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extras })
  editavel(campo).dispatchEvent(tecla)
  return tecla
}

function capturarEnvios() {
  const chat = useChatStore()
  const chamadas: unknown[][] = []
  chat.enviarMensagemComConteudos = (async (...args: unknown[]) => { chamadas.push(args) }) as never
  return chamadas
}

const nomesDosBlocos = (chamada: unknown[]) =>
  (chamada[4] as { texto?: string; arquivo?: { nomeArquivo: string }; figurinha?: string }[]).map((b) => b.texto ?? b.arquivo?.nomeArquivo ?? b.figurinha)

describe('colar texto', () => {
  const textoLongo = Array.from({ length: 11 }, (_, i) => `const linha${i + 1} = ${i + 1};`).join('\n') + '\n'

  async function janelaCodigo(campo: VueWrapper) {
    await aguardar(50)
    return campo.findComponent(CodigoModal)
  }

  test('mais de 10 linhas abrem a janela de código já preenchida, com a linguagem', async () => {
    const campo = await montarCampo()
    const evento = colarNo(campo, { texto: textoLongo })
    expect(evento.defaultPrevented).toBe(true)
    const janela = await janelaCodigo(campo)
    expect(janela.exists()).toBe(true)
    expect(janela.props('codigoInicial')).toBe(textoLongo.trimEnd())
    expect(janela.props('linguagemInicial')).toBe('javascript')
    expect(janela.text()).toContain('const linha11 = 11;')
    expect((janela.find('select').element as HTMLSelectElement).value).toBe('javascript')
    // Nada vai para o campo enquanto a janela decide
    expect(textoDoCampo(campo)).toBe('')
  })

  test('Enviar na janela manda o bloco de código', async () => {
    rota('PUT', '/mensagem', { id: 50 })
    // Depois do envio a lista de conversas é atualizada
    rota('GET', '/conversas', [])
    const campo = await montarCampo()
    colarNo(campo, { texto: textoLongo })
    const janela = await janelaCodigo(campo)
    await janela.findAll('button').find((b) => b.text() === 'Enviar')!.trigger('click')
    await aguardar(30)
    const [envio] = pedidosDe('PUT', '/mensagem')
    expect(envio!.corpo.conteudos[0].conteudo).toBe('```javascript\n' + textoLongo.trimEnd() + '\n```')
    expect(campo.findComponent(CodigoModal).exists()).toBe(false)
  })

  test('texto longo com blocos ``` dentro também abre a janela; a cerca de fora é maior', async () => {
    rota('PUT', '/mensagem', { id: 51 })
    rota('GET', '/conversas', [])
    const markdown = '# Guia\n\nExemplo:\n```js\nconst a = 1\n```\n' + Array.from({ length: 160 }, (_, i) => `Passo ${i}.`).join('\n')
    const campo = await montarCampo()
    colarNo(campo, { texto: markdown })
    const janela = await janelaCodigo(campo)
    expect(janela.exists()).toBe(true)
    expect(janela.props('linguagemInicial')).toBe('markdown')
    await janela.findAll('button').find((b) => b.text() === 'Enviar')!.trigger('click')
    await aguardar(30)
    const enviado: string = pedidosDe('PUT', '/mensagem')[0]!.corpo.conteudos[0].conteudo
    expect(enviado.startsWith('````markdown\n')).toBe(true)
    expect(enviado.endsWith('\n````')).toBe(true)
    expect(enviado).toContain('```js\nconst a = 1\n```')
  })

  test('Cancelar cola o texto como estava (era só sugestão)', async () => {
    const campo = await montarCampo()
    colarNo(campo, { texto: textoLongo })
    const janela = await janelaCodigo(campo)
    await janela.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')
    await aguardar()
    expect(campo.findComponent(CodigoModal).exists()).toBe(false)
    expect(textoDoCampo(campo)).toBe(textoLongo.trimEnd())
  })

  test('código curto colado vira bloco direto, sem janela', async () => {
    const campo = await montarCampo()
    const evento = colarNo(campo, { texto: 'function soma(a, b) {\n  return a + b;\n}' })
    expect(evento.defaultPrevented).toBe(true)
    await aguardar(50)
    expect(textoDoCampo(campo)).toMatch(/^```\w+\nfunction soma\(a, b\) \{\n  return a \+ b;\n\}\n```$/)
  })

  test('abrir a janela pelo menu de anexo começa vazia', async () => {
    const campo = await montarCampo()
    await campo.find('button[title="Anexar"]').trigger('click')
    await campo.findAll('button').find((b) => b.text() === 'Código')!.trigger('click')
    const janela = await janelaCodigo(campo)
    expect(janela.props('codigoInicial')).toBeUndefined()
    expect(janela.props('linguagemInicial')).toBeUndefined()
  })

  test('texto comum entra sem a formatação de origem, com as quebras de linha', async () => {
    const campo = await montarCampo()
    const evento = colarNo(campo, { texto: 'Oi, tudo bem?\nAmanhã a gente conversa.' })
    expect(evento.defaultPrevented).toBe(true)
    expect(textoDoCampo(campo)).toBe('Oi, tudo bem?\nAmanhã a gente conversa.')
  })

  test('"@[Nome](id)" colado de uma mensagem volta a ser menção, e vai como @[Nome](id)', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    colarNo(campo, { texto: 'fala @[Ana Souza](2) tudo bem' })
    const mencao = editavel(campo).querySelector<HTMLElement>('[data-type="mention"]')!
    expect(mencao.dataset.id).toBe('2')
    expect(textoDoCampo(campo)).toBe('fala @Ana Souza tudo bem')
    teclar(campo, 'Enter')
    await aguardar()
    expect(chamadas[0]![0]).toBe('fala @[Ana Souza](2) tudo bem')
  })
})

describe('campo com imagens, áudio, arquivos e figurinhas no meio do texto', () => {
  beforeEach(() => {
    // happy-dom não cria URL de arquivo
    URL.createObjectURL = () => `blob:teste-${Math.random()}`
    URL.revokeObjectURL = () => {}
  })

  const imagem = () => new File(['png'], 'tela.png', { type: 'image/png' })

  test('imagem colada vira uma peça no campo, que não se edita por dentro', async () => {
    const campo = await montarCampo()
    colarNo(campo, { arquivos: [imagem()] })
    await aguardar()
    const peca = editavel(campo).querySelector<HTMLElement>('[data-anexo]')!
    expect(peca.getAttribute('contenteditable')).toBe('false')
    expect(peca.querySelector('img')).not.toBeNull()
    expect(campo.find('button[title="Enviar"]').exists()).toBe(true)
  })

  test('o "×" no canto da imagem a tira do campo', async () => {
    const campo = await montarCampo()
    colarNo(campo, { arquivos: [imagem()] })
    await aguardar()
    editavel(campo).querySelector<HTMLElement>('[data-remover]')!.click()
    await aguardar()
    expect(editavel(campo).querySelector('[data-anexo]')).toBeNull()
    // Sem nada no campo, volta o microfone no lugar do enviar
    expect(campo.find('button[title="Enviar"]').exists()).toBe(false)
  })

  test('Backspace no começo da linha abaixo apaga a imagem; Ctrl+Z a traz de volta, e ela vai no envio', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    colarNo(campo, { arquivos: [imagem()] })
    digitar(campo, 'depois')
    await aguardar(600)
    // Cursor no começo de "depois"
    window.getSelection()!.collapse(editavel(campo).querySelector('p')!.firstChild!, 0)
    await aguardar()
    teclar(campo, 'Backspace')
    await aguardar()
    expect(editavel(campo).querySelector('[data-anexo]')).toBeNull()
    expect(textoDoCampo(campo)).toBe('depois')
    await aguardar(600)
    teclar(campo, 'z', { ctrlKey: true })
    await aguardar()
    expect(editavel(campo).querySelector('[data-anexo] img')).not.toBeNull()
    teclar(campo, 'Enter')
    await aguardar()
    expect(nomesDosBlocos(chamadas[0]!)).toEqual(['tela.png', 'depois'])
  })

  test('imagem copiada do próprio campo e colada de novo duplica; as duas vão no envio', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    colarNo(campo, { arquivos: [imagem()] })
    await aguardar()
    const id = editavel(campo).querySelector<HTMLElement>('[data-anexo]')!.dataset.anexo!
    // O que o editor põe na área de transferência ao copiar a peça
    const evento = colarNo(campo, { html: `<div data-pm-slice="0 0 []"><div data-anexo="${id}"></div></div>`, texto: '' })
    await aguardar()
    expect(evento.defaultPrevented).toBe(true)
    expect(editavel(campo).querySelectorAll('[data-anexo] img')).toHaveLength(2)
    teclar(campo, 'Enter')
    await aguardar()
    expect(nomesDosBlocos(chamadas[0]!)).toEqual(['tela.png', 'tela.png'])
  })

  test('peça colada cujo arquivo o campo não tem (de outra conversa) fica de fora, sem espaço vazio', async () => {
    const campo = await montarCampo()
    digitar(campo, 'oi')
    colarNo(campo, { html: '<div data-pm-slice="0 0 []"><div data-anexo="anexo-de-outra-conversa"></div></div>', texto: '' })
    await aguardar()
    expect(editavel(campo).querySelector('[data-anexo]')).toBeNull()
    expect(textoDoCampo(campo)).toBe('oi')
  })

  test('duas imagens coladas uma depois da outra ficam juntas, sem linha no meio', async () => {
    const campo = await montarCampo()
    colarNo(campo, { arquivos: [imagem()] })
    colarNo(campo, { arquivos: [imagem()] })
    await aguardar()
    const [primeira, segunda] = editavel(campo).querySelectorAll('[data-anexo]')
    expect(primeira!.nextElementSibling).toBe(segunda!)
  })

  test('texto, imagem e texto vão na ordem em que estão no campo; o campo fica limpo', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    digitar(campo, 'antes')
    colarNo(campo, { arquivos: [imagem()] })
    digitar(campo, 'depois')
    await aguardar()
    await campo.find('button[title="Enviar"]').trigger('click')
    await aguardar()
    expect(nomesDosBlocos(chamadas[0]!)).toEqual(['antes', 'tela.png', 'depois'])
    expect(textoDoCampo(campo)).toBe('')
    expect(editavel(campo).querySelector('[data-anexo]')).toBeNull()
  })

  test('Enter envia; Shift+Enter quebra a linha; só texto vai como antes, sem blocos', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    digitar(campo, 'oi')
    teclar(campo, 'Enter', { shiftKey: true })
    digitar(campo, 'tudo bem?')
    await aguardar()
    expect(chamadas).toHaveLength(0)
    teclar(campo, 'Enter')
    await aguardar()
    expect(chamadas).toEqual([['oi\ntudo bem?', [], null]])
  })

  test('"+" > Confirmar leitura mostra o aviso; o X desfaz', async () => {
    const campo = await montarCampo()
    await campo.find('button[title="Anexar"]').trigger('click')
    await campo.findAll('button').find((b) => b.text() === 'Confirmar leitura')!.trigger('click')
    expect(useChatStore().pedirConfirmacao).toBe(true)
    expect(campo.text()).toContain('A mensagem vai pedir confirmação de leitura')
    await campo.find('button[title="Não pedir confirmação"]').trigger('click')
    expect(useChatStore().pedirConfirmacao).toBe(false)
    expect(campo.text()).not.toContain('A mensagem vai pedir confirmação de leitura')
  })

  describe('sugestão da IA', () => {
    let relogio: ReturnType<typeof relogioFalso>
    beforeEach(async () => {
      rota('GET', '/recursos', { transcricao: false, ia: true })
      await useRecursos().recarregar()
      usePreferenciaSugestoes().alterar(true)
    })
    afterEach(() => relogio?.restaurar())
    const sugestaoNaTela = (campo: VueWrapper) => editavel(campo).querySelector('[data-sugestao]')?.textContent ?? null

    async function digitarEPausar(campo: VueWrapper, texto: string) {
      relogio?.restaurar()
      relogio = relogioFalso()
      digitar(campo, texto)
      relogio.avancar(600)
      await aguardar(5)
    }

    test('depois da pausa, aparece em cinza; Tab aceita', async () => {
      rota('POST', '/ia/sugestao', { sugestao: ' aguardar até segunda.' })
      const campo = await montarCampo()
      await digitarEPausar(campo, 'Ok, então vamos')
      expect(pedidosDe('POST', '/ia/sugestao')[0]!.corpo).toEqual({ conversa_id: 1, texto: 'Ok, então vamos' })
      expect(sugestaoNaTela(campo)).toBe(' aguardar até segunda.')
      expect(textoDoCampo(campo)).toBe('Ok, então vamos')
      teclar(campo, 'Tab')
      await aguardar()
      expect(textoDoCampo(campo)).toBe('Ok, então vamos aguardar até segunda.')
      expect(sugestaoNaTela(campo)).toBeNull()
    })

    test('Esc descarta e continuar digitando apaga a sugestão; sem sugestão, Tab põe espaços', async () => {
      rota('POST', '/ia/sugestao', { sugestao: ' a todos!' })
      const campo = await montarCampo()
      await digitarEPausar(campo, 'Bom dia')
      expect(sugestaoNaTela(campo)).toBe(' a todos!')
      teclar(campo, 'Escape')
      await aguardar()
      expect(sugestaoNaTela(campo)).toBeNull()
      teclar(campo, 'Tab')
      await aguardar()
      expect(textoDoCampo(campo)).toBe('Bom dia    ')

      await digitarEPausar(campo, 'x')
      expect(sugestaoNaTela(campo)).toBe(' a todos!')
      digitar(campo, 'y')
      await aguardar()
      expect(sugestaoNaTela(campo)).toBeNull()
    })

    test('desligada nas configurações, ou com pouco texto, não pede', async () => {
      rota('POST', '/ia/sugestao', { sugestao: ' nada' })
      const campo = await montarCampo()
      await digitarEPausar(campo, 'Oi')
      expect(pedidosDe('POST', '/ia/sugestao')).toHaveLength(0)
      usePreferenciaSugestoes().alterar(false)
      relogio.restaurar()
      await digitarEPausar(campo, ' tudo bem com você')
      expect(pedidosDe('POST', '/ia/sugestao')).toHaveLength(0)
      expect(localStorage.getItem('conversa.sugestoesIa')).toBe('0')
    })
  })

  test('Ctrl+Enter também envia', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    digitar(campo, 'oi')
    teclar(campo, 'Enter', { ctrlKey: true })
    await aguardar()
    expect(chamadas).toEqual([['oi', [], null]])
  })

  test('@ digitado abre a lista de contatos; escolher vira menção', async () => {
    const campo = await montarCampo(TipoConversa.Grupo)
    const chat = useChatStore()
    chat.contatos = [{ id: 2, nome: 'Bruno', login: 'bruno' }, { id: 3, nome: 'Carla', login: 'carla' }] as never
    const chamadas = capturarEnvios()
    digitar(campo, 'oi @car')
    await aguardar()
    const lista = campo.findComponent(MencaoDropdown)
    expect(lista.exists()).toBe(true)
    expect(lista.props('termo')).toBe('car')
    lista.vm.$emit('selecionar', { id: 3, nome: 'Carla' })
    await aguardar()
    expect(campo.findComponent(MencaoDropdown).exists()).toBe(false)
    teclar(campo, 'Enter')
    await aguardar()
    expect((chamadas[0]![0] as string).trim()).toBe('oi @[Carla](3)')
  })

  test('GIF copiado (PNG + HTML com o GIF) entra como GIF, com a animação', async () => {
    const campo = await montarCampo()
    const chamadas = capturarEnvios()
    colarNo(campo, { arquivos: [new File(['png'], 'image.png', { type: 'image/png' })], texto: '<img src="data:image/gif;base64,R0lGODlh">' })
    await aguardar()
    await campo.find('button[title="Enviar"]').trigger('click')
    await aguardar()
    const blocos = chamadas[0]![4] as { arquivo: { mimeType: string; nomeArquivo: string } }[]
    expect(blocos[0]!.arquivo.mimeType).toBe('image/gif')
    expect(blocos[0]!.arquivo.nomeArquivo).toEndWith('.gif')
  })

  test('figurinha: com o campo vazio vai na hora; com algo escrito, entra no campo', async () => {
    const campo = await montarCampo()
    const chat = useChatStore()
    const figurinhas: string[] = []
    chat.enviarFigurinha = (async (id: string) => { figurinhas.push(id) }) as never
    const seletor = async () => {
      await campo.find('button[title="Emoji"]').trigger('click')
      return campo.findComponent({ name: 'EmojiPicker' })
    }
    ;(await seletor()).vm.$emit('figurinha', 'basico/coracao')
    await aguardar()
    expect(figurinhas).toEqual(['basico/coracao'])

    digitar(campo, 'olha')
    ;(await seletor()).vm.$emit('figurinha', 'basico/festa')
    await aguardar()
    expect(figurinhas).toEqual(['basico/coracao'])
    expect(editavel(campo).querySelector<HTMLElement>('[data-figurinha]')!.dataset.figurinha).toBe('basico/festa')
  })

  test('arquivo escolhido no "+" e arrastado para a conversa entram no campo', async () => {
    const campo = await montarCampo()
    ;(campo.vm as unknown as { adicionarArquivosExternos: (f: File[]) => void }).adicionarArquivosExternos([
      new File(['a'], 'nota.pdf', { type: 'application/pdf' }),
      new File(['b'], 'musica.mp3', { type: 'audio/mpeg' }),
    ])
    await aguardar()
    const pecas = [...editavel(campo).querySelectorAll<HTMLElement>('[data-anexo]')]
    expect(pecas.map((p) => p.textContent?.trim())).toEqual(['📄 nota.pdf', '🎵 musica.mp3'])
  })
})

describe('avatar com endereço vencido', () => {
  test('na barra da chamada, a imagem que falha pede um endereço novo e volta a aparecer', async () => {
    let n = 0
    rota('GET', '/anexo', () => ({ url: `https://localhost/storage/avatar-${++n}` }))
    const auth = useAuthStore()
    await auth.resolverAvatarUrl()
    const call = useCallStore()
    call.estado = 'ativa'
    const barra = mount(CallBar, { attachTo: document.body })
    montados.push(barra)
    const imagem = () => barra.find('img[src^="https://localhost/storage/avatar"]')
    expect(imagem().attributes('src')).toBe('https://localhost/storage/avatar-1')
    await imagem().trigger('error')
    await aguardar(10)
    await flushPromises()
    expect(imagem().attributes('src')).toBe('https://localhost/storage/avatar-2')
    // Imagem nova: sem o display:none que a falha deixou na antiga
    expect(imagem().attributes('style') ?? '').not.toContain('display: none')
  })

  test('na configuração do usuário, o mesmo', async () => {
    let n = 0
    rota('GET', '/anexo', () => ({ url: `https://localhost/storage/avatar-${++n}` }))
    rota('GET', '/sip', {})
    const auth = useAuthStore()
    await auth.resolverAvatarUrl()
    const tela = mount(ProfileSettingsModal, { props: { aberta: true, inline: true, abaAtiva: 'usuario' }, attachTo: document.body })
    montados.push(tela)
    await flushPromises()
    const imagem = () => tela.find('img[alt="Avatar"]')
    expect(imagem().attributes('src')).toBe('https://localhost/storage/avatar-1')
    await imagem().trigger('error')
    await aguardar(10)
    await flushPromises()
    expect(imagem().attributes('src')).toBe('https://localhost/storage/avatar-2')
    expect(pedidosDe('GET', '/anexo')).toHaveLength(2)
  })
})
