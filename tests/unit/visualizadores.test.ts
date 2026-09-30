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
  const w = mount(componente as never, { attachTo: document.body, ...opcoes })
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
    expect(iframe.getAttribute('srcdoc')).toBe('<h1>Olá</h1><script>alert(1)</script>')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
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

  test('HTML e PDF têm botão Abrir; outros arquivos só Download', () => {
    for (const [nome, abrir] of [['pagina.html', true], ['pagina.HTM', true], ['doc.pdf', true], ['planilha.xlsx', false]] as const) {
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

  test('HTML abre no visualizador isolado, e não numa aba nova', async () => {
    const abertos: string[] = []
    const abrirOriginal = window.open
    window.open = ((url: string) => void abertos.push(url)) as unknown as typeof window.open
    try {
      rota('GET', '/anexo', { url: 'https://localhost/storage/h' })
      rota('GET', '/storage/h', new Response('<p>pagina</p>'))
      const tela = await montarLista([anexo(1, 'pagina.html'), anexo(2, 'planilha.xlsx')])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('pagina.html'))!.trigger('click')
      await aguardar(20)
      expect(document.querySelector('iframe[sandbox="allow-scripts"]')).not.toBeNull()
      expect(abertos).toEqual([])
      await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('planilha.xlsx'))!.trigger('click')
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

  test('imagem abre a galeria só com as imagens', async () => {
    const tela = await montarLista([anexo(1, 'a.png', TipoConteudo.Imagem), anexo(2, 'b.txt'), anexo(3, 'c.png', TipoConteudo.Imagem)])
    await tela.findAll('div.cursor-pointer').find((d) => d.text().includes('a.png'))!.trigger('click')
    const [[item, galeria]] = tela.emitted('open-image-gallery') as [[AnexoItem, AnexoItem[]]]
    expect(item.anexo_id).toBe(1)
    expect(galeria.map((g) => g.anexo_id)).toEqual([1, 3])
  })
})
