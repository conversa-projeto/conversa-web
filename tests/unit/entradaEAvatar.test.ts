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
    expect(linha.element.parentElement!.querySelector('textarea')).not.toBeNull()
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

describe('colar texto', () => {
  // happy-dom não tem execCommand: insere na caixa como o navegador faria
  function colar(campo: VueWrapper, texto: string) {
    const caixa = campo.find('textarea').element as HTMLTextAreaElement
    const original = document.execCommand
    document.execCommand = ((_comando: string, _ui: boolean, valor: string) => {
      caixa.setRangeText(valor, caixa.selectionStart, caixa.selectionEnd, 'end')
      caixa.dispatchEvent(new Event('input'))
      return true
    }) as typeof document.execCommand
    const evento = new Event('paste', { cancelable: true }) as ClipboardEvent
    Object.defineProperty(evento, 'clipboardData', { value: { items: [{ kind: 'string', type: 'text/plain' }], getData: () => texto } })
    caixa.dispatchEvent(evento)
    return { evento, caixa, restaurar: () => { document.execCommand = original } }
  }

  function montarCampo() {
    const chat = useChatStore()
    chat.conversas = [{ id: 1, descricao: 'x', tipo: TipoConversa.Direta, inserida: new Date() }]
    chat.conversaAtivaId = 1
    const campo = mount(MessageInput, { props: { chatNoFim: true }, attachTo: document.body })
    montados.push(campo)
    return campo
  }

  const textoLongo = Array.from({ length: 11 }, (_, i) => `const linha${i + 1} = ${i + 1};`).join('\n') + '\n'

  async function janelaCodigo(campo: VueWrapper) {
    await aguardar(50)
    return campo.findComponent(CodigoModal)
  }

  test('mais de 10 linhas abrem a janela de código já preenchida, com a linguagem', async () => {
    const campo = montarCampo()
    const { evento, caixa, restaurar } = colar(campo, textoLongo)
    try {
      expect(evento.defaultPrevented).toBe(true)
      const janela = await janelaCodigo(campo)
      expect(janela.exists()).toBe(true)
      expect(janela.props('codigoInicial')).toBe(textoLongo.trimEnd())
      expect(janela.props('linguagemInicial')).toBe('javascript')
      expect(janela.text()).toContain('const linha11 = 11;')
      expect((janela.find('select').element as HTMLSelectElement).value).toBe('javascript')
      // Nada vai para a caixa enquanto a janela decide
      expect(caixa.value).toBe('')
    } finally {
      restaurar()
    }
  })

  test('Enviar na janela manda o bloco de código', async () => {
    rota('PUT', '/mensagem', { id: 50 })
    // Depois do envio a lista de conversas é atualizada
    rota('GET', '/conversas', [])
    const campo = montarCampo()
    const { restaurar } = colar(campo, textoLongo)
    try {
      const janela = await janelaCodigo(campo)
      await janela.findAll('button').find((b) => b.text() === 'Enviar')!.trigger('click')
      await aguardar(30)
      const [envio] = pedidosDe('PUT', '/mensagem')
      expect(envio!.corpo.conteudos[0].conteudo).toBe('```javascript\n' + textoLongo.trimEnd() + '\n```')
      expect(campo.findComponent(CodigoModal).exists()).toBe(false)
    } finally {
      restaurar()
    }
  })

  test('texto longo com blocos ``` dentro também abre a janela; a cerca de fora é maior', async () => {
    rota('PUT', '/mensagem', { id: 51 })
    rota('GET', '/conversas', [])
    const markdown = '# Guia\n\nExemplo:\n```js\nconst a = 1\n```\n' + Array.from({ length: 160 }, (_, i) => `Passo ${i}.`).join('\n')
    const campo = montarCampo()
    const { restaurar } = colar(campo, markdown)
    try {
      const janela = await janelaCodigo(campo)
      expect(janela.exists()).toBe(true)
      expect(janela.props('linguagemInicial')).toBe('markdown')
      await janela.findAll('button').find((b) => b.text() === 'Enviar')!.trigger('click')
      await aguardar(30)
      const enviado: string = pedidosDe('PUT', '/mensagem')[0]!.corpo.conteudos[0].conteudo
      expect(enviado.startsWith('````markdown\n')).toBe(true)
      expect(enviado.endsWith('\n````')).toBe(true)
      expect(enviado).toContain('```js\nconst a = 1\n```')
    } finally {
      restaurar()
    }
  })

  test('Cancelar cola o texto como estava (era só sugestão)', async () => {
    const campo = montarCampo()
    const { caixa, restaurar } = colar(campo, textoLongo)
    try {
      const janela = await janelaCodigo(campo)
      await janela.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')
      await aguardar()
      expect(campo.findComponent(CodigoModal).exists()).toBe(false)
      expect(caixa.value).toBe(textoLongo.trimEnd())
    } finally {
      restaurar()
    }
  })

  test('código curto colado vira bloco direto, sem janela', async () => {
    const { evento, caixa, restaurar } = colar(montarCampo(), 'function soma(a, b) {\n  return a + b;\n}')
    try {
      expect(evento.defaultPrevented).toBe(true)
      await aguardar(50)
      expect(caixa.value).toMatch(/^```\w+\nfunction soma\(a, b\) \{\n  return a \+ b;\n\}\n```$/)
    } finally {
      restaurar()
    }
  })

  test('abrir a janela pelo menu de anexo começa vazia', async () => {
    const campo = montarCampo()
    await campo.find('button[title="Anexar"]').trigger('click')
    await campo.findAll('button').find((b) => b.text() === 'Código')!.trigger('click')
    const janela = await janelaCodigo(campo)
    expect(janela.props('codigoInicial')).toBeUndefined()
    expect(janela.props('linguagemInicial')).toBeUndefined()
  })

  test('texto comum curto é colado normalmente', () => {
    const { evento, restaurar } = colar(montarCampo(), 'Oi, tudo bem?\nAmanhã a gente conversa.')
    restaurar()
    expect(evento.defaultPrevented).toBe(false)
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
