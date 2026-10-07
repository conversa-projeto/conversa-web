import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageInput from '@/components/MessageInput.vue'
import CodigoModal from '@/components/CodigoModal.vue'
import CallBar from '@/components/CallBar.vue'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useChatStore } from '@/stores/chat'
import { TipoConversa } from '@/types/api'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { instalarWebrtcFalso } from './webrtcFalso'

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

  test('a linha fica dentro da barra do campo, encostada nele', () => {
    const campo = montarCampo(TipoConversa.Direta, [2])
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

// happy-dom não tem execCommand: o texto entra no fim do campo, como o
// navegador faria com o cursor lá
function simularDigitacao() {
  const original = document.execCommand
  document.execCommand = ((_comando: string, _ui: boolean, valor: string) => {
    const el = document.activeElement as HTMLElement
    el.append(document.createTextNode(valor))
    el.dispatchEvent(new Event('input'))
    return true
  }) as typeof document.execCommand
  return () => { document.execCommand = original }
}

function montarCampo(tipo: TipoConversa = TipoConversa.Direta) {
  const chat = useChatStore()
  chat.conversas = [{ id: 1, descricao: 'x', tipo, inserida: new Date() }]
  chat.conversaAtivaId = 1
  const campo = mount(MessageInput, { props: { chatNoFim: true }, attachTo: document.body })
  montados.push(campo)
  return campo
}

const editavel = (campo: VueWrapper) => campo.find('[contenteditable="true"]').element as HTMLElement

function colarNo(campo: VueWrapper, dados: { texto?: string; arquivos?: File[] }) {
  const el = editavel(campo)
  el.focus()
  const evento = new Event('paste', { cancelable: true }) as ClipboardEvent
  Object.defineProperty(evento, 'clipboardData', { value: { files: dados.arquivos ?? [], getData: () => dados.texto ?? '' } })
  el.dispatchEvent(evento)
  return evento
}

describe('colar texto', () => {
  let restaurar: () => void
  beforeEach(() => { restaurar = simularDigitacao() })
  afterEach(() => restaurar())

  const textoLongo = Array.from({ length: 11 }, (_, i) => `const linha${i + 1} = ${i + 1};`).join('\n') + '\n'

  async function janelaCodigo(campo: VueWrapper) {
    await aguardar(50)
    return campo.findComponent(CodigoModal)
  }

  test('mais de 10 linhas abrem a janela de código já preenchida, com a linguagem', async () => {
    const campo = montarCampo()
    const evento = colarNo(campo, { texto: textoLongo })
    expect(evento.defaultPrevented).toBe(true)
    const janela = await janelaCodigo(campo)
    expect(janela.exists()).toBe(true)
    expect(janela.props('codigoInicial')).toBe(textoLongo.trimEnd())
    expect(janela.props('linguagemInicial')).toBe('javascript')
    expect(janela.text()).toContain('const linha11 = 11;')
    expect((janela.find('select').element as HTMLSelectElement).value).toBe('javascript')
    // Nada vai para o campo enquanto a janela decide
    expect(editavel(campo).textContent).toBe('')
  })

  test('Enviar na janela manda o bloco de código', async () => {
    rota('PUT', '/mensagem', { id: 50 })
    // Depois do envio a lista de conversas é atualizada
    rota('GET', '/conversas', [])
    const campo = montarCampo()
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
    const campo = montarCampo()
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
    const campo = montarCampo()
    colarNo(campo, { texto: textoLongo })
    const janela = await janelaCodigo(campo)
    await janela.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')
    await aguardar()
    expect(campo.findComponent(CodigoModal).exists()).toBe(false)
    expect(editavel(campo).textContent).toBe(textoLongo.trimEnd())
  })

  test('código curto colado vira bloco direto, sem janela', async () => {
    const campo = montarCampo()
    const evento = colarNo(campo, { texto: 'function soma(a, b) {\n  return a + b;\n}' })
    expect(evento.defaultPrevented).toBe(true)
    await aguardar(50)
    expect(editavel(campo).textContent).toMatch(/^```\w+\nfunction soma\(a, b\) \{\n  return a \+ b;\n\}\n```\n$/)
  })

  test('abrir a janela pelo menu de anexo começa vazia', async () => {
    const campo = montarCampo()
    await campo.find('button[title="Anexar"]').trigger('click')
    await campo.findAll('button').find((b) => b.text() === 'Código')!.trigger('click')
    const janela = await janelaCodigo(campo)
    expect(janela.props('codigoInicial')).toBeUndefined()
    expect(janela.props('linguagemInicial')).toBeUndefined()
  })

  test('texto comum entra sem a formatação de origem', () => {
    const campo = montarCampo()
    const evento = colarNo(campo, { texto: 'Oi, tudo bem?\nAmanhã a gente conversa.' })
    expect(evento.defaultPrevented).toBe(true)
    expect(editavel(campo).textContent).toBe('Oi, tudo bem?\nAmanhã a gente conversa.')
  })

  test('"@[Nome](id)" colado de uma mensagem volta a ser menção', () => {
    const campo = montarCampo()
    colarNo(campo, { texto: 'fala @[Ana Souza](2) tudo bem' })
    const mencao = editavel(campo).querySelector<HTMLElement>('[data-mencao-id]')!
    expect(mencao.dataset.mencaoId).toBe('2')
    expect(editavel(campo).textContent).toBe('fala @Ana Souza tudo bem')
  })
})

describe('campo com imagens, áudio, arquivos e figurinhas no meio do texto', () => {
  let restaurar: () => void
  beforeEach(() => {
    restaurar = simularDigitacao()
    // happy-dom não cria URL de arquivo
    URL.createObjectURL = () => `blob:teste-${Math.random()}`
    URL.revokeObjectURL = () => {}
  })
  afterEach(() => restaurar())

  const imagem = () => new File(['png'], 'tela.png', { type: 'image/png' })

  test('imagem colada vira uma peça no campo, que não se edita por dentro', async () => {
    const campo = montarCampo()
    colarNo(campo, { arquivos: [imagem()] })
    await campo.vm.$nextTick()
    const peca = editavel(campo).querySelector<HTMLElement>('[data-anexo]')!
    expect(peca.getAttribute('contenteditable')).toBe('false')
    expect(peca.querySelector('img')).not.toBeNull()
    // Bloco numa linha própria, com o cursor na linha de baixo
    expect(peca.classList.contains('block')).toBe(true)
    expect(peca.nextSibling?.textContent).toBe('​')
    expect(campo.find('button[title="Enviar"]').exists()).toBe(true)
  })

  test('o "×" no canto da imagem a tira do campo', async () => {
    const campo = montarCampo()
    colarNo(campo, { arquivos: [imagem()] })
    await campo.vm.$nextTick()
    const el = editavel(campo)
    expect(el.querySelector('[data-anexo]')).not.toBeNull()
    el.querySelector<HTMLElement>('[data-remover]')!.click()
    await campo.vm.$nextTick()
    expect(el.querySelector('[data-anexo]')).toBeNull()
    expect(el.textContent).toBe('')
    // Sem nada no campo, volta o microfone no lugar do enviar
    expect(campo.find('button[title="Enviar"]').exists()).toBe(false)
  })

  test('Backspace no começo do texto abaixo da imagem apaga a imagem; as linhas continuam separadas', async () => {
    const campo = montarCampo()
    const el = editavel(campo)
    el.focus()
    document.execCommand('insertText', false, 'antes')
    colarNo(campo, { arquivos: [imagem()] })
    document.execCommand('insertText', false, 'depois')
    await campo.vm.$nextTick()
    const texto = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('depois')) as Text
    const intervalo = document.createRange()
    intervalo.setStart(texto, texto.data.indexOf('d'))
    intervalo.collapse(true)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(intervalo)
    const tecla = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    el.dispatchEvent(tecla)
    await campo.vm.$nextTick()
    expect(tecla.defaultPrevented).toBe(true)
    expect(el.querySelector('[data-anexo]')).toBeNull()
    expect(el.textContent!.replaceAll('​', '')).toBe('antesdepois')
    expect(el.querySelector('br')).not.toBeNull()
  })

  test('seta para cima abaixo de uma imagem que abre o campo cria uma linha acima dela', async () => {
    const campo = montarCampo()
    const chat = useChatStore()
    const chamadas: unknown[][] = []
    chat.enviarMensagemComConteudos = (async (...args: unknown[]) => { chamadas.push(args) }) as never
    const el = editavel(campo)
    el.focus()
    colarNo(campo, { arquivos: [imagem()] })
    document.execCommand('insertText', false, 'abaixo')
    await campo.vm.$nextTick()
    const tecla = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    el.dispatchEvent(tecla)
    expect(tecla.defaultPrevented).toBe(true)
    // O cursor fica numa linha nova, antes da imagem
    const selecao = window.getSelection()!
    expect(selecao.anchorNode).toBe(el.firstChild)
    expect(el.firstChild!.nextSibling).toBe(el.querySelector('[data-anexo]'))
    selecao.anchorNode!.textContent += 'acima'
    await campo.find('button[title="Enviar"]').trigger('click')
    await aguardar()
    const blocos = chamadas[0]![4] as { texto?: string; arquivo?: { nomeArquivo: string } }[]
    expect(blocos.map((b) => b.texto ?? b.arquivo!.nomeArquivo)).toEqual(['acima', 'tela.png', 'abaixo'])
  })

  test('Delete ou Backspace na linha vazia acima da imagem tira só a linha', async () => {
    const campo = montarCampo()
    const el = editavel(campo)
    el.focus()
    colarNo(campo, { arquivos: [imagem()] })
    document.execCommand('insertText', false, 'abaixo')
    await campo.vm.$nextTick()
    for (const key of ['Delete', 'Backspace']) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
      expect(el.firstChild).not.toBe(el.querySelector('[data-anexo]'))
      const tecla = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      el.dispatchEvent(tecla)
      expect(tecla.defaultPrevented).toBe(true)
      expect(el.firstChild).toBe(el.querySelector('[data-anexo]'))
    }
  })

  test('Backspace no meio do texto não mexe na imagem', async () => {
    const campo = montarCampo()
    const el = editavel(campo)
    el.focus()
    colarNo(campo, { arquivos: [imagem()] })
    document.execCommand('insertText', false, 'depois')
    await campo.vm.$nextTick()
    const texto = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('depois')) as Text
    const intervalo = document.createRange()
    intervalo.setStart(texto, texto.data.indexOf('e'))
    intervalo.collapse(true)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(intervalo)
    const tecla = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    el.dispatchEvent(tecla)
    expect(tecla.defaultPrevented).toBe(false)
    expect(el.querySelector('[data-anexo]')).not.toBeNull()
  })

  test('texto, imagem e texto vão na ordem em que estão no campo', async () => {
    const campo = montarCampo()
    const chat = useChatStore()
    const chamadas: unknown[][] = []
    chat.enviarMensagemComConteudos = (async (...args: unknown[]) => { chamadas.push(args) }) as never
    const el = editavel(campo)
    el.focus()
    document.execCommand('insertText', false, 'antes')
    colarNo(campo, { arquivos: [imagem()] })
    document.execCommand('insertText', false, 'depois')
    await campo.vm.$nextTick()
    await campo.find('button[title="Enviar"]').trigger('click')
    await aguardar()
    const blocos = chamadas[0]![4] as { texto?: string; arquivo?: { nomeArquivo: string } }[]
    expect(blocos.map((b) => b.texto ?? b.arquivo!.nomeArquivo)).toEqual(['antes', 'tela.png', 'depois'])
    // O campo fica limpo para a próxima
    expect(el.textContent).toBe('')
    expect(el.querySelector('[data-anexo]')).toBeNull()
  })

  test('só texto vai como antes, sem blocos', async () => {
    const campo = montarCampo()
    const chat = useChatStore()
    const chamadas: unknown[][] = []
    chat.enviarMensagemComConteudos = (async (...args: unknown[]) => { chamadas.push(args) }) as never
    editavel(campo).focus()
    document.execCommand('insertText', false, 'oi')
    await editavel(campo).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await aguardar()
    expect(chamadas).toEqual([['oi', [], null]])
  })

  test('figurinha: com o campo vazio vai na hora; com algo escrito, entra no campo', async () => {
    const campo = montarCampo()
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

    editavel(campo).focus()
    document.execCommand('insertText', false, 'olha')
    ;(await seletor()).vm.$emit('figurinha', 'basico/festa')
    await aguardar()
    expect(figurinhas).toEqual(['basico/coracao'])
    expect(editavel(campo).querySelector<HTMLElement>('[data-figurinha]')!.dataset.figurinha).toBe('basico/festa')
  })

  test('arquivo escolhido no "+" e arrastado para a conversa entram no campo', () => {
    const campo = montarCampo()
    ;(campo.vm as unknown as { adicionarArquivosExternos: (f: File[]) => void }).adicionarArquivosExternos([
      new File(['a'], 'nota.pdf', { type: 'application/pdf' }),
      new File(['b'], 'musica.mp3', { type: 'audio/mpeg' }),
    ])
    const pecas = [...editavel(campo).querySelectorAll<HTMLElement>('[data-anexo]')]
    expect(pecas.map((p) => p.textContent)).toEqual(['📄 nota.pdf', '🎵 musica.mp3'])
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
