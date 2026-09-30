import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfiguracaoCores from '@/components/ConfiguracaoCores.vue'
import ConfiguracaoChamadas from '@/components/ConfiguracaoChamadas.vue'
import AnexoPopup from '@/components/AnexoPopup.vue'
import AnexosPage from '@/components/AnexosPage.vue'
import AnexosLista from '@/components/AnexosLista.vue'
import VisualizadorPdf from '@/components/VisualizadorPdf.vue'
import { useTheme } from '@/composables/useTheme'
import { useConfigChamada } from '@/composables/useConfigChamada'
import { useCoresPersonalizadas } from '@/composables/useCoresPersonalizadas'
import { useChatStore } from '@/stores/chat'
import { TipoConversa, type Conversa } from '@/types/api'
import { aguardar, erro, rota } from './apiFalsa'

// pdf.js não roda no happy-dom: o falso tem páginas de 600 x 800
const paginasDesenhadas: number[] = []
let pdfFalha = false
const destruido = mock(async () => {})
mock.module('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: ({ url }: { url: string }) => ({
    promise: pdfFalha ? Promise.reject(new Error('PDF inválido')) : Promise.resolve({
      url,
      numPages: 3,
      loadingTask: { destroy: destruido },
      getPage: async (numero: number) => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
        render: () => ({ promise: Promise.resolve(void paginasDesenhadas.push(numero)) }),
      }),
    }),
  }),
}))
mock.module('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/pdf.worker.js' }))

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
const botao = (tela: VueWrapper, texto: string) => tela.findAll('button').find((b) => b.text() === texto)!
const conversa = (id: number, extras: Partial<Conversa> = {}): Conversa => ({ id, descricao: `Conversa ${id}`, tipo: TipoConversa.Direta, inserida: new Date(), ...extras } as Conversa)

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('configuração de cores', () => {
  afterEach(() => {
    useCoresPersonalizadas().restaurarCores('claro')
    useCoresPersonalizadas().restaurarCores('escuro')
    useTheme().isDark.value = false
  })

  test('edita o tema atual; a cor escolhida fica marcada e pode voltar ao padrão', async () => {
    useTheme().isDark.value = false
    const tela = montar(ConfiguracaoCores)
    expect(tela.text()).toContain('tema claro')
    expect(botao(tela, 'Restaurar todas').attributes('disabled')).toBeDefined()
    const cor = tela.find('input[title="--color-primary-600"]')
    await cor.setValue('#123456')
    await cor.trigger('input')
    expect(useCoresPersonalizadas().personalizacao.value.claro['--color-primary-600']).toBe('#123456')
    expect(tela.text()).toContain('#123456')
    expect(botao(tela, 'Restaurar todas').attributes('disabled')).toBeUndefined()
    expect(botao(tela, 'Restaurar grupo').exists()).toBe(true)
    await tela.find('button[title="Voltar ao padrão"]').trigger('click')
    expect(useCoresPersonalizadas().personalizacao.value.claro).toEqual({})
  })

  test('restaurar o grupo e todas', async () => {
    const tela = montar(ConfiguracaoCores)
    useCoresPersonalizadas().definirCor('claro', '--color-primary-600', '#111111')
    useCoresPersonalizadas().definirCor('claro', '--color-surface-base', '#222222')
    await tela.vm.$nextTick()
    await tela.findAll('button').filter((b) => b.text() === 'Restaurar grupo')[0]!.trigger('click')
    expect(Object.keys(useCoresPersonalizadas().personalizacao.value.claro)).toHaveLength(1)
    await botao(tela, 'Restaurar todas').trigger('click')
    expect(useCoresPersonalizadas().personalizacao.value.claro).toEqual({})
  })

  test('busca pelo nome da variável (com ou sem --color-) ou pelo uso', async () => {
    const tela = montar(ConfiguracaoCores)
    const busca = tela.find('input[type="search"]')
    await busca.setValue('--color-primary-600')
    expect(tela.findAll('input[type="color"]').map((i) => i.attributes('title'))).toEqual(['--color-primary-600'])
    await busca.setValue('zzz-nada')
    expect(tela.text()).toContain('Nenhuma cor encontrada.')
  })

  test('no tema escuro edita as cores do escuro', async () => {
    useTheme().isDark.value = true
    const tela = montar(ConfiguracaoCores)
    expect(tela.text()).toContain('tema escuro')
    await tela.find('input[title="--color-primary-600"]').setValue('#abcdef')
    await tela.find('input[title="--color-primary-600"]').trigger('input')
    expect(useCoresPersonalizadas().personalizacao.value.escuro['--color-primary-600']).toBe('#abcdef')
  })
})

describe('configuração das chamadas', () => {
  afterEach(() => useConfigChamada().restaurarPadrao())

  test('liga e desliga o processamento de áudio e escolhe as opções, com a descrição de cada uma', async () => {
    const tela = montar(ConfiguracaoChamadas)
    const { config } = useConfigChamada()
    const [ruido] = tela.findAll('input[type="checkbox"]')
    const antes = config.value.reducaoRuido
    await ruido!.setValue(!antes)
    expect(config.value.reducaoRuido).toBe(!antes)
    await botao(tela, 'Música').trigger('click')
    expect(config.value.qualidadeAudio).toBe('musica')
    expect(tela.text()).toContain('Estéreo a 128 kbps')
    await botao(tela, '1080p').trigger('click')
    await botao(tela, '15').trigger('click')
    await botao(tela, 'Econômico').trigger('click')
    await botao(tela, 'Fluidez').trigger('click')
    expect(config.value).toMatchObject({ resolucao: '1080', fps: 15, bandaVideo: 'economico', prioridadeTela: 'fluidez' })
    expect(tela.text()).toContain('Até 0,5 Mbps')
    await botao(tela, 'Restaurar padrão').trigger('click')
    expect(config.value.qualidadeAudio).not.toBe('musica')
  })
})

describe('menu de anexar', () => {
  test('Arquivo e Código emitem; clique fora fecha', async () => {
    const tela = montar(AnexoPopup)
    await botao(tela, 'Arquivo').trigger('click')
    await botao(tela, 'Código').trigger('click')
    expect(tela.emitted('arquivo')).toHaveLength(1)
    expect(tela.emitted('codigo')).toHaveLength(1)
    await aguardar(5)
    tela.find('button').element.click()
    expect(tela.emitted('close')).toBeUndefined()
    document.body.click()
    expect(tela.emitted('close')).toHaveLength(1)
  })
})

describe('página de anexos', () => {
  function preparar() {
    rota('GET', '/anexos', [])
    useChatStore().conversas = [
      conversa(1, { descricao: 'Bruno', mensagem_id: 5, ultima_mensagem_texto: 'oi', avatar_url: 'https://localhost/storage/b' }),
      conversa(2, { descricao: 'Equipe Bravo', tipo: TipoConversa.Grupo, mensagem_id: 9 }),
      conversa(3, { descricao: '', nome: '' }),
    ]
  }

  test('busca conversas pelo nome, as mais recentes primeiro, e escolhe uma', async () => {
    preparar()
    const tela = montar(AnexosPage)
    expect(tela.text()).toContain('Selecione um contato ou grupo')
    await tela.find('input').setValue('br')
    const resultados = tela.findAll('button.border-b')
    expect(resultados.map((r) => r.find('.truncate').text())).toEqual(['Equipe Bravo', 'Bruno'])
    expect(resultados[0]!.text()).toContain('Grupo')
    expect(resultados[0]!.text()).toContain('Sem mensagens')
    expect(resultados[1]!.find('img').attributes('src')).toBe('https://localhost/storage/b')
    await resultados[1]!.trigger('click')
    expect(tela.emitted('update:conversa-id')).toEqual([[1]])
    expect(tela.findComponent(AnexosLista).props('conversaId')).toBe(1)
    await tela.find('button[title="Limpar selecao"]').trigger('click')
    expect(tela.emitted('update:conversa-id')).toEqual([[1], [null]])
    expect(tela.findComponent(AnexosLista).exists()).toBe(false)
  })

  test('sem resultado avisa', async () => {
    preparar()
    const tela = montar(AnexosPage)
    await tela.find('input').setValue('zzz')
    expect(tela.text()).toContain('Nenhum resultado')
  })

  test('conversa escolhida de fora (Ver anexos) e repasse dos eventos da lista', async () => {
    preparar()
    const tela = montar(AnexosPage, { props: { conversaIdInicial: 3 } })
    expect(tela.text()).toContain('Conversa #3')
    await tela.setProps({ conversaIdInicial: 2 })
    expect(tela.text()).toContain('Equipe Bravo')
    const lista = tela.findComponent(AnexosLista)
    lista.vm.$emit('open-message', 2, 50)
    lista.vm.$emit('open-image-gallery', { anexo_id: 1 }, [])
    expect(tela.emitted('open-message')).toEqual([[2, 50]])
    expect(tela.emitted('open-image-gallery')).toEqual([[{ anexo_id: 1 }, []]])
  })
})

describe('visualizador de PDF', () => {
  let observados: { alvo: Element; avisar: (entradas: { isIntersecting: boolean; target: Element }[]) => void }[]

  beforeEach(() => {
    paginasDesenhadas.length = 0
    pdfFalha = false
    observados = []
    class ObservadorFalso {
      constructor(private avisar: (entradas: { isIntersecting: boolean; target: Element }[]) => void) {}
      observe(alvo: Element) { observados.push({ alvo, avisar: this.avisar }) }
      disconnect() {}
    }
    Object.assign(window, { IntersectionObserver: ObservadorFalso })
  })
  const observadorOriginal = window.IntersectionObserver
  afterEach(() => Object.assign(window, { IntersectionObserver: observadorOriginal }))

  async function aberto() {
    rota('GET', '/anexo', { url: 'https://localhost/storage/doc.pdf' })
    const tela = montar(VisualizadorPdf, { props: { identificador: 'pdf-1', nome: 'contrato.pdf' } })
    expect(document.body.textContent).toContain('Carregando PDF...')
    await aguardar(20)
    return tela
  }
  const paginas = () => [...document.querySelectorAll('canvas')] as HTMLCanvasElement[]
  const avisarVisivel = (numero: number) => {
    const observado = observados.filter((o) => (o.alvo as HTMLElement).dataset.pagina === String(numero)).at(-1)!
    observado.avisar([{ isIntersecting: true, target: observado.alvo }])
  }

  test('abre o PDF pelo endereço do anexo, uma página por canvas na largura da tela', async () => {
    await aberto()
    expect(document.body.textContent).toContain('contrato.pdf')
    expect(document.body.textContent).toContain('1 / 3')
    expect(paginas()).toHaveLength(3)
    const largura = Math.min(900, Math.max(240, window.innerWidth - 24))
    expect(paginas()[0]!.style.width).toBe(`${largura}px`)
    expect(paginas()[0]!.style.height).toBe(`${Math.round(largura * 800 / 600)}px`)
  })

  test('desenha cada página quando fica visível, uma vez só', async () => {
    await aberto()
    avisarVisivel(2)
    avisarVisivel(2)
    await aguardar(5)
    expect(paginasDesenhadas).toEqual([2])
  })

  test('zoom redesenha, dentro dos limites; clicar na porcentagem volta a 100%', async () => {
    await aberto()
    const clicar = (titulo: string) => (document.querySelector(`button[title="${titulo}"]`) as HTMLElement).click()
    avisarVisivel(1)
    await aguardar(5)
    for (let i = 0; i < 10; i++) clicar('Aumentar')
    await aguardar(5)
    expect(document.body.textContent).toContain('300%')
    expect((document.querySelector('button[title="Aumentar"]') as HTMLButtonElement).disabled).toBe(true)
    avisarVisivel(1)
    await aguardar(5)
    expect(paginasDesenhadas).toEqual([1, 1])
    for (let i = 0; i < 20; i++) clicar('Diminuir')
    await aguardar(5)
    expect(document.body.textContent).toContain('50%')
    clicar('Ajustar à largura')
    await aguardar(5)
    expect(document.body.textContent).toContain('100%')
  })

  test('rolar atualiza a página atual', async () => {
    await aberto()
    const [p1, p2] = paginas()
    p1!.getBoundingClientRect = () => ({ top: -900, bottom: -100 } as DOMRect)
    p2!.getBoundingClientRect = () => ({ top: -100, bottom: 700 } as DOMRect)
    document.querySelector('.overflow-auto')!.dispatchEvent(new Event('scroll'))
    await aguardar()
    expect(document.body.textContent).toContain('2 / 3')
  })

  test('janela redimensionada recalcula a largura', async () => {
    await aberto()
    window.dispatchEvent(new Event('resize'))
    await aguardar()
    expect(paginas()).toHaveLength(3)
  })

  test('baixar, fechar pelo botão, pelo Esc e clicando fora; fechar libera o documento', async () => {
    const tela = await aberto()
    ;(document.querySelector('button[title="Baixar"]') as HTMLElement).click()
    ;(document.querySelector('button[title="Fechar (Esc)"]') as HTMLElement).click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    ;(document.querySelector('.fixed.inset-0') as HTMLElement).click()
    expect(tela.emitted('baixar')).toHaveLength(1)
    expect(tela.emitted('fechar')).toHaveLength(3)
    tela.unmount()
    montados.splice(montados.indexOf(tela), 1)
    expect(destruido).toHaveBeenCalled()
  })

  test('PDF que não abre sugere baixar', async () => {
    pdfFalha = true
    await aberto()
    expect(document.body.textContent).toContain('Não foi possível abrir o PDF. Tente baixar o arquivo.')
  })

  test('anexo indisponível também', async () => {
    rota('GET', '/anexo', erro(404, 'Anexo não encontrado'))
    montar(VisualizadorPdf, { props: { identificador: 'x', nome: 'x.pdf' } })
    await aguardar(20)
    expect(document.body.textContent).toContain('Não foi possível abrir o PDF')
  })
})
