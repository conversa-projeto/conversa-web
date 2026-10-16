import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ImageViewerModal from '@/components/ImageViewerModal.vue'
import VisualizadorHtml from '@/components/VisualizadorHtml.vue'
import AnexosLista from '@/components/AnexosLista.vue'
import MessageContent from '@/components/MessageContent.vue'
import { TipoConteudo, type AnexoItem } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { conteudo } from './fabrica'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('visualizador de imagem', () => {
  const base = { aberta: true, url: 'https://localhost/storage/a', nome: 'a.png', zoom: 1, translateX: 0, translateY: 0, isDragging: false, transicaoAtiva: false, anexosUrl: {} }

  test('mostra o texto enviado junto da imagem atual', () => {
    const tela = montar(ImageViewerModal, { props: { ...base, identificadorAtual: 'a', galeria: [{ identificador: 'a', nome: 'a.png', legenda: 'Olha isso!' }, { identificador: 'b', nome: 'b.png', legenda: 'outra' }] } })
    expect(tela.text()).toContain('Olha isso!')
    expect(tela.text()).not.toContain('outra')
    expect(tela.find('img[alt="a.png"]').classes()).toContain('max-h-[70vh]')
  })

  test('sem texto, não mostra legenda e a imagem usa mais altura', () => {
    const tela = montar(ImageViewerModal, { props: { ...base, identificadorAtual: 'a', galeria: [{ identificador: 'a', nome: 'a.png' }] } })
    expect(tela.find('p').exists()).toBe(false)
    expect(tela.find('img[alt="a.png"]').classes()).toContain('max-h-[85vh]')
  })

  test('legenda em várias linhas preserva as quebras', () => {
    const tela = montar(ImageViewerModal, { props: { ...base, identificadorAtual: 'a', galeria: [{ identificador: 'a', nome: 'a.png', legenda: 'linha 1\nlinha 2' }] } })
    expect(tela.find('p').classes()).toContain('whitespace-pre-wrap')
    expect(tela.find('p').text()).toContain('linha 1\nlinha 2')
  })

  test('controles: fechar, zoom e escolher outra imagem da galeria', async () => {
    const tela = montar(ImageViewerModal, { props: { ...base, identificadorAtual: 'a', galeria: [{ identificador: 'a', nome: 'a.png' }, { identificador: 'b', nome: 'b.png' }] } })
    await tela.findAll('button').find((b) => b.text() === 'Fechar')!.trigger('click')
    await tela.findAll('button').find((b) => b.text() === '+')!.trigger('click')
    await tela.findAll('button').find((b) => b.text() === '-')!.trigger('click')
    await tela.find('button[data-id="b"]').trigger('click')
    expect(tela.emitted('close')).toHaveLength(1)
    expect(tela.emitted('zoom-in')).toHaveLength(1)
    expect(tela.emitted('zoom-out')).toHaveLength(1)
    expect(tela.emitted('select-image')).toEqual([['b', 'b.png']])
  })

  test('vídeo toca no mesmo visualizador, com controles; sem zoom nem copiar', async () => {
    const galeria = [{ identificador: 'a', nome: 'a.png' }, { identificador: 'v', nome: 'festa.mp4', legenda: 'A festa', video: true }]
    const tela = montar(ImageViewerModal, { props: { ...base, url: 'https://localhost/storage/v', nome: 'festa.mp4', identificadorAtual: 'v', galeria, anexosUrl: { a: 'https://localhost/storage/a', v: 'https://localhost/storage/v' } } })
    const video = tela.find('.flex-1 video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('https://localhost/storage/v')
    expect(video.attributes()).not.toHaveProperty('controls')
    expect(video.attributes()).toHaveProperty('autoplay')
    expect(video.classes()).toContain('max-h-[70vh]')
    for (const titulo of ['Velocidade', 'Silenciar', 'Volume', 'Baixar vídeo', 'Tela cheia']) {
      expect(tela.find(`[title="${titulo}"]`).exists()).toBe(true)
    }
    expect(tela.find('[title="Abrir no visualizador"]').exists()).toBe(false)
    expect(tela.find('.flex-1 img').exists()).toBe(false)
    expect(tela.text()).toContain('Carregando vídeo')
    expect(tela.text()).toContain('A festa')
    expect(tela.findAll('button').some((b) => b.text() === '+')).toBe(false)
    expect(tela.find('button[title^="Copiar imagem"]').exists()).toBe(false)
    expect(tela.findAll('button').some((b) => b.text() === 'Fechar')).toBe(true)
    await video.trigger('loadeddata')
    expect(tela.text()).not.toContain('Carregando vídeo')
    // Na galeria, a miniatura do vídeo é o primeiro quadro com o play
    const miniatura = tela.find('button[data-id="v"]')
    expect(miniatura.find('video').attributes('src')).toBe('https://localhost/storage/v#t=0.1')
    expect(miniatura.find('svg').exists()).toBe(true)
    expect(tela.find('button[data-id="a"] img').exists()).toBe(true)
    // Voltar para a imagem: zoom de volta
    await tela.setProps({ identificadorAtual: 'a', url: 'https://localhost/storage/a', nome: 'a.png' })
    expect(tela.find('.flex-1 img').exists()).toBe(true)
    expect(tela.findAll('button').some((b) => b.text() === '+')).toBe(true)
  })

  test('vídeo no visualizador: velocidade, volume acima de 100% em vermelho, mudo e download', async () => {
    const ganhos: number[] = []
    class ContextoFalso {
      destination = {}
      createGain() { return { gain: { set value(v: number) { ganhos.push(v) } }, connect: (d: unknown) => d } }
      createMediaElementSource() { return { connect: (d: unknown) => d } }
      async resume() {}
      async close() {}
    }
    const original = globalThis.AudioContext
    globalThis.AudioContext = ContextoFalso as never
    try {
      rota('GET', '/anexo', { url: 'https://localhost/storage/v' })
      const galeria = [{ identificador: 'v', nome: 'festa.mp4', video: true }]
      const tela = montar(ImageViewerModal, { props: { ...base, url: 'https://localhost/storage/v', nome: 'festa.mp4', identificadorAtual: 'v', galeria, anexosUrl: {} } })
      const video = tela.find('video').element as HTMLVideoElement

      await tela.find('[title="Velocidade"]').trigger('click')
      await tela.findAll('button').find((b) => b.text() === '2x')!.trigger('click')
      expect(video.playbackRate).toBe(2)
      expect(tela.find('[title="Velocidade"]').text()).toBe('2x')

      const barraVolume = tela.find('[title="Volume"]')
      barraVolume.element.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect
      ;(barraVolume.element as HTMLElement).setPointerCapture = () => {}
      barraVolume.element.dispatchEvent(new PointerEvent('pointerdown', { clientX: 75 }))
      await aguardar(0)
      expect(tela.text()).toContain('150%')
      expect(tela.findAll('span').find((s) => s.text() === '150%')!.classes()).toContain('text-red-400')
      expect(video.volume).toBe(1)
      expect(ganhos.at(-1)).toBe(1.5)

      await tela.find('[title="Silenciar"]').trigger('click')
      expect(video.muted).toBe(true)
      expect(tela.text()).toContain('0%')
      await tela.find('[title="Ativar som"]').trigger('click')
      expect(video.muted).toBe(false)
      expect(tela.text()).toContain('150%')

      await tela.find('[title="Baixar vídeo"]').trigger('click')
      await aguardar(10)
      expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
    } finally {
      globalThis.AudioContext = original
    }
  })

  test('fechada, não mostra nada', () => {
    const tela = montar(ImageViewerModal, { props: { ...base, aberta: false, identificadorAtual: 'a', galeria: [] } })
    expect(tela.html()).not.toContain('img')
  })
})

describe('visualizador de HTML', () => {
  test('mostra o HTML num iframe isolado do app (sem allow-same-origin)', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/pagina' })
    rota('GET', '/storage/pagina', new Response('<h1>Olá</h1><script>alert(1)</script>'))
    montar(VisualizadorHtml, { props: { identificador: 'x', nome: 'pagina.html' } })
    await aguardar(10)
    const iframe = document.querySelector('iframe')!
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(iframe.getAttribute('srcdoc')).toEndWith('<h1>Olá</h1><script>alert(1)</script>')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  test('links "#..." rolam dentro do documento: o script entra logo depois do <head>', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/pagina' })
    rota('GET', '/storage/pagina', new Response('<!DOCTYPE html><html><head><title>T</title></head><body><a href="#status">ir</a><h2 id="status">S</h2></body></html>'))
    montar(VisualizadorHtml, { props: { identificador: 'x', nome: 'pagina.html' } })
    await aguardar(10)
    const srcdoc = document.querySelector('iframe')!.getAttribute('srcdoc')!
    expect(srcdoc).toStartWith('<!DOCTYPE html><html><head><script>')
    expect(srcdoc).toContain("closest('a[href^=\"#\"]')")
    expect(srcdoc).toContain('scrollIntoView')
    expect(srcdoc).toEndWith('<title>T</title></head><body><a href="#status">ir</a><h2 id="status">S</h2></body></html>')
  })

  test('ver fonte mostra o HTML como veio, com destaque, e volta para a página', async () => {
    const fonte = '<html>\n  <body><h1 class="t">Olá</h1></body>\n</html>'
    rota('GET', '/anexo', { url: 'https://localhost/storage/pagina' })
    rota('GET', '/storage/pagina', new Response(fonte))
    montar(VisualizadorHtml, { props: { identificador: 'x', nome: 'pagina.html' } })
    await aguardar(10)
    ;(document.querySelector('button[title="Ver fonte"]') as HTMLElement).click()
    await aguardar(50)
    expect(document.querySelector('iframe')).toBeNull()
    const codigo = document.querySelector('pre code')!
    expect(codigo.textContent).toBe(fonte)
    expect(codigo.querySelector('.hljs-tag')).not.toBeNull()
    ;(document.querySelector('button[title="Ver página"]') as HTMLElement).click()
    await flushPromises()
    expect(document.querySelector('iframe')).not.toBeNull()
  })

  test('arquivo indisponível mostra erro e sugere baixar', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/sumiu' })
    rota('GET', '/storage/sumiu', new Response('', { status: 404 }))
    montar(VisualizadorHtml, { props: { identificador: 'x', nome: 'p.html' } })
    await aguardar(10)
    expect(document.body.textContent).toContain('Não foi possível abrir o HTML')
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('baixar, fechar pelo botão e pelo Esc', async () => {
    rota('GET', '/anexo', erro(404, 'x'))
    const tela = montar(VisualizadorHtml, { props: { identificador: 'x', nome: 'p.html' } })
    await aguardar(5)
    ;(document.querySelector('button[title="Baixar"]') as HTMLElement).click()
    ;(document.querySelector('button[title="Fechar (Esc)"]') as HTMLElement).click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tela.emitted('baixar')).toHaveLength(1)
    expect(tela.emitted('fechar')).toHaveLength(2)
  })
})

describe('arquivo no chat', () => {
  const props = (nome: string, extras = {}) => ({ conteudo: conteudo(TipoConteudo.Arquivo, 'id-1', { nome, ...extras }), mensagemId: 1, getAnexoUrl: () => '' })

  test('HTML, PDF e Office têm botão Abrir; outros arquivos só Download', () => {
    for (const [nome, abrir] of [['pagina.html', true], ['pagina.HTM', true], ['doc.pdf', true], ['planilha.xlsx', true], ['texto.DOCX', true], ['slides.pptx', true], ['antigo.doc', false], ['pacote.zip', false]] as const) {
      const tela = montar(MessageContent, { props: props(nome) })
      expect(tela.findAll('button').some((b) => b.text() === 'Abrir')).toBe(abrir)
      expect(tela.findAll('button').some((b) => b.text() === 'Download')).toBe(true)
    }
  })

  test('Abrir num HTML abre o visualizador isolado', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/p' })
    rota('GET', '/storage/p', new Response('<p>oi</p>'))
    const tela = montar(MessageContent, { props: props('pagina.html') })
    await tela.findAll('button').find((b) => b.text() === 'Abrir')!.trigger('click')
    await aguardar(20)
    expect(document.querySelector('iframe[sandbox="allow-scripts"]')).not.toBeNull()
  })

  test('vídeo aparece como prévia, o play toca no chat e o botão do canto abre no visualizador', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Arquivo, 'vid-1', { nome: 'festa.mp4' }), mensagemId: 1, getAnexoUrl: (id: string) => `https://localhost/storage/${id}` } })
    const video = tela.find('video')
    expect(video.attributes('src')).toBe('https://localhost/storage/vid-1#t=0.1')
    expect(video.attributes()).not.toHaveProperty('controls')
    const elemento = video.element as HTMLVideoElement
    let tocou = false
    let pausou = false
    elemento.play = async () => { tocou = true }
    elemento.pause = () => { pausou = true }
    Object.defineProperty(elemento, 'paused', { value: true, configurable: true })
    await tela.find('[title="Reproduzir vídeo"]').trigger('click')
    await aguardar(300)
    expect(tocou).toBe(true)
    await video.trigger('play')
    expect(tela.find('[title="Reproduzir vídeo"]').exists()).toBe(false)
    expect(tela.find('[title="Pausar"]').exists()).toBe(true)
    expect(tela.find('[title="Tela cheia"]').exists()).toBe(true)
    expect(tela.emitted('open-image')).toBeUndefined()
    await tela.find('[title="Abrir no visualizador"]').trigger('click')
    expect(pausou).toBe(true)
    expect(tela.emitted('open-image')).toEqual([['vid-1', 'festa.mp4']])
    await tela.find('[title="Baixar vídeo"]').trigger('click')
    expect(tela.emitted('download')).toEqual([['vid-1', 'festa.mp4']])
  })

  test('a barra do vídeo começa escondida e aparece com o mouse sobre ele', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Arquivo, 'vid-1', { nome: 'festa.mp4' }), mensagemId: 1, getAnexoUrl: (id: string) => `https://localhost/storage/${id}` } })
    expect(tela.find('.bg-gradient-to-t').classes()).toContain('opacity-0')
    const caixa = tela.find('video').element.parentElement!
    caixa.dispatchEvent(new Event('mousemove'))
    caixa.dispatchEvent(new Event('mouseleave'))
    await aguardar(0)
    expect(tela.find('.bg-gradient-to-t').classes()).toContain('opacity-100')
  })

  test('dois cliques rápidos no vídeo entram na tela cheia sem tocar', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Arquivo, 'vid-1', { nome: 'festa.mp4' }), mensagemId: 1, getAnexoUrl: (id: string) => `https://localhost/storage/${id}` } })
    const video = tela.find('video')
    const elemento = video.element as HTMLVideoElement
    let tocou = false
    let telaCheia = false
    elemento.play = async () => { tocou = true }
    elemento.parentElement!.requestFullscreen = async () => { telaCheia = true }
    await video.trigger('click')
    await video.trigger('click')
    await aguardar(300)
    expect(telaCheia).toBe(true)
    expect(tocou).toBe(false)
  })

  test('vídeo sem endereço ainda: só o fundo com o play; enviando (local): toca, mas não expande', async () => {
    const semUrl = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Arquivo, 'vid-1', { nome: 'v.mp4' }), mensagemId: 1, getAnexoUrl: () => '' } })
    expect(semUrl.find('video').exists()).toBe(false)
    const local = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Arquivo, 'vid-2', { nome: 'v.webm', localUrl: 'blob:x' }), mensagemId: 1, getAnexoUrl: () => '' } })
    expect(local.find('video').attributes('src')).toBe('blob:x#t=0.1')
    expect(local.find('[title="Reproduzir vídeo"]').exists()).toBe(true)
    expect(local.find('[title="Abrir no visualizador"]').exists()).toBe(false)
    expect(local.find('[title="Baixar vídeo"]').exists()).toBe(false)
  })

  test('Download emite o identificador e o nome', async () => {
    const tela = montar(MessageContent, { props: props('planilha.xlsx') })
    await tela.findAll('button').find((b) => b.text() === 'Download')!.trigger('click')
    expect(tela.emitted('download')).toEqual([['id-1', 'planilha.xlsx']])
  })

  test('arquivo ainda sendo enviado (local) não tem Abrir nem Download', () => {
    const tela = montar(MessageContent, { props: props('pagina.html', { localUrl: 'blob:x' }) })
    expect(tela.findAll('button').filter((b) => ['Abrir', 'Download'].includes(b.text()))).toEqual([])
  })
})

describe('código longo na mensagem', () => {
  // happy-dom não calcula layout: o teste diz as alturas e avisa as mudanças
  let avisar: ((entradas: { target: Element }[]) => void) | null
  const observados: Element[] = []
  const observadorOriginal = globalThis.ResizeObserver
  beforeEach(() => {
    observados.length = 0
    globalThis.ResizeObserver = class {
      constructor(retorno: (entradas: { target: Element }[]) => void) { avisar = retorno }
      observe(el: Element) { observados.push(el) }
      unobserve() {}
      disconnect() {}
    } as never
  })
  afterEach(() => { globalThis.ResizeObserver = observadorOriginal })

  const alturas = (el: Element, total: number, visivel: number) => {
    Object.defineProperty(el, 'scrollHeight', { value: total, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: visivel, configurable: true })
  }
  const codigo = Array.from({ length: 40 }, (_, i) => `linha ${i}`).join('\n')

  test('bloco que nasce escondido ganha o botão de expandir quando aparece', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Texto, '```ts\n' + codigo + '\n```'), mensagemId: 1, getAnexoUrl: () => '' } })
    const bloco = tela.find('pre[data-bloco-codigo]')
    // Escondido ao montar: altura 0, sem botão
    expect(tela.text()).not.toContain('Expandir código')
    expect(observados).toContain(bloco.element)
    alturas(bloco.element, 800, 240)
    avisar!([{ target: bloco.element }])
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Expandir código')
    expect(bloco.classes()).toContain('max-h-60')
    await tela.findAll('button').find((b) => b.text() === 'Expandir código')!.trigger('click')
    expect(bloco.classes()).not.toContain('max-h-60')
    expect(tela.text()).toContain('Recolher código')
  })

  test('conteúdo que cresce depois (aviso vindo do filho) também conta', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Texto, '```ts\n' + codigo + '\n```'), mensagemId: 1, getAnexoUrl: () => '' } })
    const bloco = tela.find('pre[data-bloco-codigo]')
    const filho = bloco.find('code').element
    expect(observados).toContain(filho)
    alturas(bloco.element, 900, 240)
    avisar!([{ target: filho }])
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Expandir código')
  })

  test('código curto não ganha botão', async () => {
    const tela = montar(MessageContent, { props: { conteudo: conteudo(TipoConteudo.Texto, '```ts\nconst a = 1\n```'), mensagemId: 1, getAnexoUrl: () => '' } })
    const bloco = tela.find('pre[data-bloco-codigo]')
    alturas(bloco.element, 40, 40)
    avisar!([{ target: bloco.element }])
    await tela.vm.$nextTick()
    expect(tela.text()).not.toContain('Expandir código')
  })
})

describe('tela de Anexos', () => {
  function anexo(anexo_id: number, nome: string, tipo: number = TipoConteudo.Arquivo): Partial<AnexoItem> {
    return { anexo_id, identificador: `id-${anexo_id}`, nome, extensao: nome.split('.').pop()!, tamanho: 2048, criado_em: new Date(), tipo, mensagem_id: 1, conversa_id: 5, autor_id: 2, autor_nome: 'Ana', url: `https://localhost/storage/${anexo_id}` }
  }

  async function montarLista(itens: Partial<AnexoItem>[]) {
    rota('GET', '/anexos', itens)
    const tela = montar(AnexosLista, { props: { conversaId: 5 } })
    await aguardar(10)
    return tela
  }

  test('carrega os anexos da conversa, com nome, tamanho e autor', async () => {
    const tela = await montarLista([anexo(1, 'relatorio.pdf')])
    expect(pedidosDe('GET', '/anexos')[0]!.consulta).toMatchObject({ conversa: '5', tipos: '2,3,4,5', limite: '60' })
    expect(tela.text()).toContain('relatorio.pdf')
    expect(tela.text()).toContain('2.0 KB')
    expect(tela.text()).toContain('Ana')
  })

  test('HTML e Office abrem no visualizador, e não numa aba nova', async () => {
    const abertos: string[] = []
    const abrirOriginal = window.open
    window.open = ((url: string) => void abertos.push(url)) as unknown as typeof window.open
    try {
      rota('GET', '/anexo', { url: 'https://localhost/storage/h' })
      rota('GET', '/storage/h', new Response('<p>pagina</p>'))
      const tela = await montarLista([anexo(1, 'pagina.html'), anexo(2, 'pacote.zip'), anexo(3, 'planilha.xlsx')])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('pagina.html'))!.trigger('click')
      await aguardar(20)
      expect(document.querySelector('iframe[sandbox="allow-scripts"]')).not.toBeNull()
      expect(abertos).toEqual([])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('planilha.xlsx'))!.trigger('click')
      await aguardar(20)
      expect(abertos).toEqual([])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('pacote.zip'))!.trigger('click')
      expect(abertos).toEqual(['https://localhost/storage/2'])
    } finally {
      window.open = abrirOriginal
    }
  })

  test('filtros de direção e tipo refazem a busca', async () => {
    const tela = await montarLista([])
    await tela.findAll('button').find((b) => b.text() === 'Enviados')!.trigger('click')
    await aguardar(10)
    await tela.findAll('button').find((b) => b.text() === 'Imagens')!.trigger('click')
    await aguardar(10)
    expect(pedidosDe('GET', '/anexos').map((p) => [p.consulta.direcao, p.consulta.tipos])).toEqual([['', '2,3,4,5'], ['enviados', '2,3,4,5'], ['enviados', '2']])
  })

  test('vídeo abre no visualizador com as imagens e os vídeos, e não numa aba nova', async () => {
    const abertos: string[] = []
    const abrirOriginal = window.open
    window.open = ((url: string) => void abertos.push(url)) as unknown as typeof window.open
    try {
      const tela = await montarLista([anexo(1, 'a.png', TipoConteudo.Imagem), anexo(2, 'festa.mp4'), anexo(3, 'b.txt')])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('festa.mp4'))!.trigger('click')
      const [[item, galeria]] = tela.emitted('open-image-gallery') as [[AnexoItem, AnexoItem[]]]
      expect(item.anexo_id).toBe(2)
      expect(galeria.map((g) => g.anexo_id)).toEqual([1, 2])
      expect(abertos).toEqual([])
    } finally {
      window.open = abrirOriginal
    }
  })

  test('imagem abre a galeria só com as imagens', async () => {
    const tela = await montarLista([anexo(1, 'a.png', TipoConteudo.Imagem), anexo(2, 'b.txt'), anexo(3, 'c.png', TipoConteudo.Imagem)])
    await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('a.png'))!.trigger('click')
    const [[item, galeria]] = tela.emitted('open-image-gallery') as [[AnexoItem, AnexoItem[]]]
    expect(item.anexo_id).toBe(1)
    expect(galeria.map((g) => g.anexo_id)).toEqual([1, 3])
  })
})
