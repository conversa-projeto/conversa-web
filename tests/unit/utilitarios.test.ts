import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref, type ObjectDirective } from 'vue'
import { redimensionarImagem } from '@/utils/imageResize'
import { copiarImagem } from '@/utils/copiarImagem'
import { vSrcObject as diretiva } from '@/directives/vSrcObject'
import { useDraggable } from '@/composables/useDraggable'
import { useDragAndDrop } from '@/composables/useDragAndDrop'
import { useImagePreview } from '@/composables/useImagePreview'
import { useAttachments } from '@/composables/useAttachments'
import { useCallPopup } from '@/composables/useCallPopup'
import { useFalaChamada } from '@/composables/useFalaChamada'
import { ehLinguagemMermaid, renderizarMermaid, substituirMermaidNoHtml } from '@/composables/useMermaid'
import { useCallStore } from '@/stores/call'
import { useChatStore } from '@/stores/chat'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'
import { instalarWebrtcFalso, MidiaFalsa, TrilhaFalsa } from './webrtcFalso'

const montados: VueWrapper[] = []
// Monta um componente vazio só para rodar o composable dentro de um setup
function comSetup<T>(usar: () => T): { valor: T; tela: VueWrapper } {
  let valor!: T
  const tela = mount(defineComponent({ setup() { valor = usar(); return () => h('div') } }), { attachTo: document.body })
  montados.push(tela)
  return { valor, tela }
}
function desmontar(tela: VueWrapper) {
  tela.unmount()
  montados.splice(montados.indexOf(tela), 1)
}

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

// Imagem e canvas do happy-dom não desenham: o teste troca pelos falsos
function comImagemFalsa(largura: number, altura: number, carrega = true) {
  const desenhos: number[][] = []
  const ImagemOriginal = globalThis.Image
  const criarOriginal = document.createElement.bind(document)
  class ImagemFalsa {
    width = largura
    height = altura
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_url: string) { queueMicrotask(() => (carrega ? this.onload?.() : this.onerror?.())) }
  }
  Object.assign(globalThis, { Image: ImagemFalsa })
  const saida = { tipo: 'image/jpeg' as string | null, contexto: true }
  document.createElement = ((tag: string) => {
    if (tag !== 'canvas') return criarOriginal(tag)
    return {
      width: 0,
      height: 0,
      getContext: () => (saida.contexto ? { drawImage: (...args: number[]) => void desenhos.push(args.slice(1)) } : null),
      toBlob: (pronto: (b: Blob | null) => void, tipo: string) => pronto(saida.tipo ? new Blob(['img'], { type: tipo }) : null),
    }
  }) as typeof document.createElement
  return {
    desenhos,
    saida,
    restaurar: () => {
      Object.assign(globalThis, { Image: ImagemOriginal })
      document.createElement = criarOriginal
    },
  }
}

describe('redimensionar imagem (avatar)', () => {
  test('corta o quadrado do centro e gera JPEG do tamanho pedido', async () => {
    const falsa = comImagemFalsa(400, 200)
    try {
      const blob = await redimensionarImagem(new Blob(['x']), 128)
      expect(blob.type).toBe('image/jpeg')
      expect(falsa.desenhos).toEqual([[100, 0, 200, 200, 0, 0, 128, 128]])
    } finally {
      falsa.restaurar()
    }
  })

  test('erros: imagem inválida, canvas sem contexto, falha ao gerar', async () => {
    const invalida = comImagemFalsa(1, 1, false)
    await expect(redimensionarImagem(new Blob(['x']))).rejects.toThrow('Falha ao carregar imagem')
    invalida.restaurar()
    const semContexto = comImagemFalsa(10, 10)
    semContexto.saida.contexto = false
    await expect(redimensionarImagem(new Blob(['x']))).rejects.toThrow('Canvas não suportado')
    semContexto.saida.contexto = true
    semContexto.saida.tipo = null
    await expect(redimensionarImagem(new Blob(['x']))).rejects.toThrow('Falha ao gerar imagem')
    semContexto.restaurar()
  })
})

describe('copiar imagem', () => {
  let gravados: Record<string, Promise<Blob>>[]
  beforeEach(() => {
    gravados = []
    class ItemFalso { constructor(public dados: Record<string, Promise<Blob>>) {} }
    Object.assign(globalThis, { ClipboardItem: ItemFalso })
    Object.defineProperty(navigator, 'clipboard', { value: { write: async (itens: ItemFalso[]) => void gravados.push(itens[0]!.dados) }, configurable: true })
  })

  test('PNG vai como está', async () => {
    rota('GET', '/storage/a.png', new Response(new Blob(['png'], { type: 'image/png' })))
    await copiarImagem('https://localhost/storage/a.png')
    const png = await gravados[0]!['image/png']!
    expect(png.type).toBe('image/png')
    expect(await png.text()).toBe('png')
  })

  test('outro formato é convertido para PNG', async () => {
    rota('GET', '/storage/a.jpg', new Response(new Blob(['jpg'], { type: 'image/jpeg' })))
    const falsa = comImagemFalsa(30, 20)
    const fechado = mock(() => {})
    Object.assign(globalThis, { createImageBitmap: async () => ({ width: 30, height: 20, close: fechado }) })
    try {
      await copiarImagem('https://localhost/storage/a.jpg')
      const png = await gravados[0]!['image/png']!
      expect(png.type).toBe('image/png')
      expect(fechado).toHaveBeenCalled()
      falsa.saida.tipo = null
      await copiarImagem('https://localhost/storage/a.jpg')
      await expect(gravados[1]!['image/png']!).rejects.toThrow('Falha ao converter a imagem')
    } finally {
      falsa.restaurar()
    }
  })
})

describe('diretiva v-src-object (vídeo da chamada)', () => {
  const vSrcObject = diretiva as ObjectDirective<HTMLMediaElement, MediaStream | null>
  // O <video> do happy-dom só aceita o MediaStream dele: um elemento simples
  // com o que a diretiva usa
  function video(tocar: (el: HTMLMediaElement) => Promise<void>) {
    const el = { srcObject: null as unknown, muted: false, play: () => tocar(el as unknown as HTMLMediaElement) }
    return el as unknown as HTMLMediaElement
  }
  const ligar = (el: HTMLMediaElement, valor: unknown, gancho: 'mounted' | 'updated' = 'mounted') =>
    vSrcObject[gancho]!(el, { value: valor } as never, null as never, null as never)

  test('liga o stream e toca; o mesmo stream não toca de novo; null e desmontar desligam', () => {
    const plays: unknown[] = []
    const el = video(async (e) => void plays.push(e.srcObject))
    const stream = new MidiaFalsa()
    ligar(el, stream)
    ligar(el, stream, 'updated')
    expect(plays).toEqual([stream])
    ligar(el, null, 'updated')
    expect(el.srcObject).toBeNull()
    ligar(el, stream)
    vSrcObject.unmounted!(el, null as never, null as never, null as never)
    expect(el.srcObject).toBeNull()
  })

  test('autoplay bloqueado: toca mudo e devolve o som depois', async () => {
    let tentativa = 0
    const mutadoNaSegunda: boolean[] = []
    const el = video(async (e) => {
      if (++tentativa === 1) throw Object.assign(new Error('x'), { name: 'NotAllowedError' })
      mutadoNaSegunda.push(e.muted)
    })
    ligar(el, new MidiaFalsa())
    await aguardar()
    expect(mutadoNaSegunda).toEqual([true])
    expect(el.muted).toBe(false)
  })

  test('outro erro de reprodução só é registrado', async () => {
    const el = video(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) })
    ligar(el, new MidiaFalsa())
    await aguardar()
    expect(el.srcObject).not.toBeNull()
  })
})

describe('janela arrastável e redimensionável', () => {
  const evento = (clientX: number, clientY: number) => {
    const alvo = { setPointerCapture: () => {} }
    return { clientX, clientY, pointerId: 1, currentTarget: alvo, preventDefault: () => {}, stopPropagation: () => {} } as unknown as PointerEvent
  }

  test('arrasta dentro da tela', () => {
    const janela = useDraggable(100, 100, 420, 350)
    janela.onPointerDown(evento(110, 110))
    expect(janela.isDragging.value).toBe(true)
    janela.onPointerMove(evento(210, 160))
    expect([janela.x.value, janela.y.value]).toEqual([200, 150])
    janela.onPointerMove(evento(-500, 99999))
    expect([janela.x.value, janela.y.value]).toEqual([0, window.innerHeight - 100])
    janela.onPointerUp()
    janela.onPointerMove(evento(300, 300))
    expect(janela.x.value).toBe(0)
  })

  test('redimensiona por cada borda, respeitando mínimo e máximo', () => {
    const janela = useDraggable(100, 100, 420, 350)
    janela.onResizePointerDown('se', evento(0, 0))
    janela.onPointerMove(evento(80, 50))
    expect([janela.width.value, janela.height.value]).toEqual([500, 400])
    janela.onPointerUp()
    janela.onResizePointerDown('nw', evento(0, 0))
    janela.onPointerMove(evento(400, 400))
    // Mínimo 320 x 240: a posição anda o que o tamanho encolheu
    expect([janela.width.value, janela.height.value, janela.x.value, janela.y.value]).toEqual([320, 240, 280, 260])
    janela.onPointerUp()
    janela.onResizePointerDown('e', evento(0, 0))
    janela.onPointerMove(evento(99999, 0))
    expect(janela.width.value).toBe(window.innerWidth * 0.9)
    expect(janela.resizeEdge.value).toBe('e')
  })

  test('posição inicial padrão no canto superior direito', () => {
    const janela = useDraggable()
    expect([janela.x.value, janela.y.value, janela.width.value, janela.height.value]).toEqual([window.innerWidth - 440, 16, 420, 350])
  })
})

describe('arrastar arquivos para o chat', () => {
  const arrasto = (tipos: string[], files?: File[]) => ({ preventDefault: () => {}, dataTransfer: { types: tipos, files, dropEffect: '' } }) as unknown as DragEvent

  test('entrar e sair de elementos internos não pisca; soltar entrega os arquivos', () => {
    const recebidos: FileList[] = []
    const alvo = useDragAndDrop((files) => recebidos.push(files))
    alvo.onDragEnter(arrasto(['Files']))
    alvo.onDragEnter(arrasto(['Files']))
    alvo.onDragLeave(arrasto(['Files']))
    expect(alvo.isDragging.value).toBe(true)
    alvo.onDragLeave(arrasto(['Files']))
    expect(alvo.isDragging.value).toBe(false)
    const sobre = arrasto(['Files'])
    alvo.onDragOver(sobre)
    expect(sobre.dataTransfer!.dropEffect).toBe('copy')
    alvo.onDragEnter(arrasto(['Files']))
    const arquivos = [new File(['a'], 'a.txt')]
    alvo.onDrop(arrasto(['Files'], arquivos))
    expect(alvo.isDragging.value).toBe(false)
    expect(recebidos).toEqual([arquivos as unknown as FileList])
  })

  test('arrastar texto não ativa; soltar sem arquivos não entrega', () => {
    const recebidos: unknown[] = []
    const alvo = useDragAndDrop((files) => recebidos.push(files))
    alvo.onDragEnter(arrasto(['text/plain']))
    alvo.onDragLeave(arrasto(['text/plain']))
    expect(alvo.isDragging.value).toBe(false)
    alvo.onDrop(arrasto(['text/plain'], []))
    alvo.onDragOver({ preventDefault: () => {} } as DragEvent)
    expect(recebidos).toEqual([])
  })
})

describe('pré-visualizar imagem colada antes de enviar', () => {
  test('abre com o endereço local, trava a rolagem; enviar manda e fecha', async () => {
    instalarWebrtcFalso()
    const enviados: unknown[][] = []
    const chat = useChatStore()
    chat.enviarArquivo = (async (...args: unknown[]) => void enviados.push(args)) as never
    const aoEnviar = mock(() => {})
    const { valor: preview, tela } = comSetup(() => useImagePreview(aoEnviar))
    const imagem = new Blob(['x'], { type: 'image/jpeg' })
    preview.abrirPreviewImagem(imagem, 'foto.jpg', '')
    await nextTick()
    expect(preview.previewImagemAberta.value).toBe(true)
    expect(preview.previewImagemUrl.value).toStartWith('blob:')
    expect(preview.previewImagemMime.value).toBe('image/png')
    expect(document.body.style.overflow).toBe('hidden')
    preview.abrirPreviewImagem(imagem, 'outra.jpg', 'image/jpeg')
    await preview.confirmarEnvioPreviewImagem()
    await nextTick()
    expect(enviados).toEqual([[imagem, 'outra.jpg', 'image/jpeg', false]])
    expect(aoEnviar).toHaveBeenCalled()
    expect(preview.previewImagemAberta.value).toBe(false)
    expect(document.body.style.overflow).toBe('')
    await preview.confirmarEnvioPreviewImagem()
    expect(enviados).toHaveLength(1)
    preview.abrirPreviewImagem(imagem, 'x.png', 'image/png')
    desmontar(tela)
    expect(document.body.style.overflow).toBe('')
  })
})

describe('endereços dos anexos', () => {
  // URL assinada do MinIO: vale X-Amz-Expires segundos a partir de X-Amz-Date
  function assinada(nome: string, assinadaEm: Date, segundos: number) {
    const data = assinadaEm.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
    return `https://localhost/storage/${nome}?X-Amz-Date=${data}&X-Amz-Expires=${segundos}`
  }

  test('busca uma vez e reusa enquanto a assinatura vale; perto de vencer busca de novo', async () => {
    const relogio = relogioFalso()
    try {
      let versao = 0
      rota('GET', '/anexo', () => ({ url: assinada(`a${++versao}`, new Date(Date.now()), 600) }))
      const anexos = useAttachments()
      expect(anexos.anexoUrl('a')).toBe('')
      await aguardar(5)
      expect(anexos.anexoUrl('a')).toContain('/a1?')
      await anexos.garantirAnexoUrl('a')
      expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
      relogio.avancar(541_000)
      anexos.anexoUrl('a')
      await aguardar(5)
      expect(anexos.anexoUrl('a')).toContain('/a2?')
    } finally {
      relogio.restaurar()
    }
  })

  test('URL sem assinatura vale até falhar ao carregar (sem buscar a cada desenho da tela)', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/sem-assinatura' })
    const anexos = useAttachments()
    await anexos.garantirAnexoUrl('b')
    await anexos.garantirAnexoUrl('b')
    await anexos.garantirAnexoUrl('')
    for (let i = 0; i < 5; i++) anexos.anexoUrl('b')
    await aguardar(5)
    expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
    await anexos.renovarAnexoUrl('b')
    expect(pedidosDe('GET', '/anexo')).toHaveLength(2)
  })

  test('anexo indisponível em segundo plano não deixa erro solto; abrir repassa o erro', async () => {
    rota('GET', '/anexo', new Response('{"error":"Anexo não encontrado"}', { status: 404, headers: { 'content-type': 'application/json' } }))
    const soltos: unknown[] = []
    const aoErro = (e: unknown) => void soltos.push(e)
    process.on('unhandledRejection', aoErro)
    try {
      const anexos = useAttachments()
      expect(anexos.anexoUrl('sumiu')).toBe('')
      await anexos.renovarAnexoUrl('sumiu2')
      await aguardar(10)
      expect(soltos).toEqual([])
      await expect(anexos.abrirAnexo('sumiu')).rejects.toThrow('Anexo não encontrado')
    } finally {
      process.off('unhandledRejection', aoErro)
    }
  })

  test('renovar depois de um erro de carga: uma tentativa por minuto', async () => {
    const relogio = relogioFalso()
    try {
      rota('GET', '/anexo', { url: 'https://localhost/storage/nova' })
      const anexos = useAttachments()
      await anexos.renovarAnexoUrl('c')
      await anexos.renovarAnexoUrl('c')
      expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
      expect(anexos.anexosUrl.value.c).toBe('https://localhost/storage/nova')
      relogio.avancar(60_000)
      await anexos.renovarAnexoUrl('c')
      expect(pedidosDe('GET', '/anexo')).toHaveLength(2)
      anexos.limparAnexos()
      expect(anexos.anexosUrl.value).toEqual({})
    } finally {
      relogio.restaurar()
    }
  })

  test('baixar: pelo blob com o nome do arquivo; se falhar, abre numa aba', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/relatorio' })
    rota('GET', '/storage/relatorio', new Response('conteúdo'))
    const cliques: string[] = []
    const clicarOriginal = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { cliques.push(this.download) }
    const abrirOriginal = window.open
    const abertos: string[] = []
    window.open = ((url: string) => void abertos.push(url)) as unknown as typeof window.open
    const fetchOriginal = globalThis.fetch
    try {
      const anexos = useAttachments()
      await anexos.abrirAnexo('d', 'relatorio.pdf')
      expect(cliques).toEqual(['relatorio.pdf'])
      globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
        if (String(entrada).includes('/storage/')) throw new Error('CORS')
        return fetchOriginal(entrada, init)
      }) as typeof fetch
      await anexos.abrirAnexo('d')
      expect(abertos).toEqual(['https://localhost/storage/relatorio'])
      rota('GET', '/anexo', new Response('{"error":"x"}', { status: 404, headers: { 'content-type': 'application/json' } }))
      const outros = useAttachments()
      await outros.abrirAnexo('sumiu').catch(() => {})
      expect(abertos).toHaveLength(1)
    } finally {
      HTMLAnchorElement.prototype.click = clicarOriginal
      window.open = abrirOriginal
      globalThis.fetch = fetchOriginal
    }
  })
})

describe('sons e aviso da chamada', () => {
  class SomFalso {
    static tocando: SomFalso[] = []
    static bloqueado = false
    dataset: Record<string, string> = {}
    loop = false
    parado = false
    src: string | null
    constructor(src: string) { this.src = src }
    play() {
      if (SomFalso.bloqueado) return Promise.reject(new Error('autoplay'))
      SomFalso.tocando.push(this)
      return Promise.resolve()
    }
    pause() { this.parado = true }
    removeAttribute() { this.src = null }
    load() {}
  }
  class NotificacaoFalsa {
    static permission = 'granted'
    static criadas: NotificacaoFalsa[] = []
    onclick: (() => void) | null = null
    fechada = false
    constructor(public titulo: string, public opcoes: NotificationOptions) { NotificacaoFalsa.criadas.push(this) }
    close() { this.fechada = true }
  }

  beforeEach(() => {
    instalarWebrtcFalso()
    SomFalso.tocando = []
    SomFalso.bloqueado = false
    NotificacaoFalsa.criadas = []
    Object.assign(globalThis, { Audio: SomFalso })
    Object.assign(window, { Notification: NotificacaoFalsa })
  })
  afterEach(() => {
    instalarWebrtcFalso()
    delete (window as { Notification?: unknown }).Notification
  })

  test('recebendo toca o toque e avisa quem liga; atender para o som e fecha o aviso', async () => {
    const call = useCallStore()
    comSetup(() => useCallPopup(ref('')))
    call.chamada = { id: 1, criado_por: 2, tipo: 2, usuarios: [{ usuario_id: 2, usuario_nome: 'Bruno', status: 1 }] } as never
    call.tipoChamada = 2
    call.estado = 'recebendo'
    await aguardar(5)
    expect(SomFalso.tocando.map((s) => [s.src, s.loop])).toEqual([['/toque.mp3', true]])
    expect(NotificacaoFalsa.criadas[0]!.opcoes).toMatchObject({ body: 'Bruno está ligando (Vídeo)', tag: 'conversa-chamada' })
    const foco = mock(() => {})
    const focoOriginal = window.focus
    window.focus = foco
    NotificacaoFalsa.criadas[0]!.onclick!()
    window.focus = focoOriginal
    expect(foco).toHaveBeenCalled()
    call.estado = 'ativa'
    await aguardar(5)
    expect(SomFalso.tocando[0]!.parado).toBe(true)
    expect(NotificacaoFalsa.criadas[0]!.fechada).toBe(true)
  })

  test('ligando toca o som de chamando; o mesmo som não recomeça', async () => {
    const call = useCallStore()
    comSetup(() => useCallPopup(ref('')))
    call.estado = 'chamando'
    await aguardar()
    call.estado = 'encerrando'
    await aguardar()
    expect(SomFalso.tocando.map((s) => s.src)).toEqual([null])
    expect(SomFalso.tocando[0]!.parado).toBe(true)
  })

  test('som bloqueado pelo navegador começa no primeiro clique', async () => {
    SomFalso.bloqueado = true
    const call = useCallStore()
    const { tela } = comSetup(() => useCallPopup(ref('')))
    call.estado = 'recebendo'
    await aguardar(5)
    expect(SomFalso.tocando).toHaveLength(0)
    SomFalso.bloqueado = false
    document.dispatchEvent(new Event('pointerdown'))
    document.dispatchEvent(new Event('keydown'))
    expect(SomFalso.tocando).toHaveLength(1)
    desmontar(tela)
  })

  test('sem permissão de notificação, só o som', async () => {
    NotificacaoFalsa.permission = 'denied'
    const call = useCallStore()
    comSetup(() => useCallPopup(ref('')))
    call.estado = 'recebendo'
    await aguardar(5)
    NotificacaoFalsa.permission = 'granted'
    expect(NotificacaoFalsa.criadas).toEqual([])
    expect(SomFalso.tocando).toHaveLength(1)
  })

  test('sair: chamando cancela, em chamada sai; erro ao ativar vídeo aparece', async () => {
    const call = useCallStore()
    const acoes: string[] = []
    call.cancelarChamada = (async () => void acoes.push('cancelar')) as never
    call.sairDaChamada = (async () => void acoes.push('sair')) as never
    call.upgradeParaVideo = (async () => { throw new Error('Sem câmera') }) as never
    const erro = ref('')
    const { valor: popup } = comSetup(() => useCallPopup(erro))
    call.estado = 'chamando'
    popup.sairDaChamadaAtual()
    call.estado = 'ativa'
    popup.sairDaChamadaAtual()
    await popup.upgradeParaVideoUI()
    expect(acoes).toEqual(['cancelar', 'sair'])
    expect(erro.value).toBe('Sem câmera')
  })
})

describe('quem está falando na chamada', () => {
  let volumes: Map<string, number>
  let agora: number
  const nowOriginal = performance.now.bind(performance)

  class ContextoFalso {
    static criados: ContextoFalso[] = []
    state = 'suspended'
    fechado = false
    constructor() { ContextoFalso.criados.push(this) }
    createMediaStreamSource(stream: MidiaFalsa) {
      return { trilha: stream.getAudioTracks()[0] as TrilhaFalsa & { id: string }, conectada: true, connect() {}, disconnect() { this.conectada = false } }
    }
    createAnalyser() {
      const analisador = {
        fftSize: 0,
        fonte: null as null | { trilha: { id: string } },
        getFloatTimeDomainData(amostra: Float32Array) { amostra.fill(volumes.get(analisador.fonte!.trilha.id) ?? 0) },
      }
      return analisador
    }
    resume() { this.state = 'running'; return Promise.resolve() }
    close() { this.fechado = true; return Promise.resolve() }
  }

  function trilha(id: string) {
    return Object.assign(new TrilhaFalsa('audio'), { id })
  }

  beforeEach(() => {
    instalarWebrtcFalso()
    volumes = new Map()
    agora = 1000
    ContextoFalso.criados = []
    performance.now = () => agora
    // O analisador guarda a fonte ligada a ele
    const ligar = ContextoFalso.prototype.createMediaStreamSource
    ContextoFalso.prototype.createMediaStreamSource = function (this: ContextoFalso, stream: MidiaFalsa) {
      const fonte = ligar.call(this, stream)
      return Object.assign(fonte, { connect: (analisador: { fonte: unknown }) => void (analisador.fonte = fonte) })
    }
    Object.assign(globalThis, { AudioContext: ContextoFalso })
  })
  afterEach(() => {
    performance.now = nowOriginal
    instalarWebrtcFalso()
  })

  test('marca quem fala acima do limiar, segura 400 ms e ignora o próprio microfone mutado', async () => {
    const relogio = relogioFalso()
    try {
      const call = useCallStore()
      call.streamLocal = new MidiaFalsa([trilha('meu-mic')]) as never
      call.peers = new Map([[2, { usuarioId: 2, usuarioNome: 'Bruno', txPc: null, rxPc: null, stream: new MidiaFalsa([trilha('bruno')]) as never }]])
      const { valor: fala, tela } = comSetup(() => useFalaChamada())
      volumes.set('bruno', 0.5)
      relogio.avancar(100)
      expect([...fala.falando.value]).toEqual([2])
      expect(ContextoFalso.criados[0]!.state).toBe('running')
      volumes.set('bruno', 0)
      volumes.set('meu-mic', 0.3)
      agora += 300
      relogio.avancar(100)
      expect([...fala.falando.value].sort()).toEqual([2, 7])
      agora += 200
      relogio.avancar(100)
      expect([...fala.falando.value]).toEqual([7])
      call.micMutado = true
      relogio.avancar(100)
      expect([...fala.falando.value]).toEqual([])
      // Bruno saiu da chamada: para de medir
      call.peers = new Map()
      call.streamLocal = null
      relogio.avancar(100)
      desmontar(tela)
      expect(ContextoFalso.criados[0]!.fechado).toBe(true)
    } finally {
      relogio.restaurar()
    }
  })

  test('troca de trilha (microfone reaberto) passa a medir a nova', async () => {
    const relogio = relogioFalso()
    try {
      const call = useCallStore()
      call.streamLocal = new MidiaFalsa([trilha('mic-1')]) as never
      const { valor: fala } = comSetup(() => useFalaChamada())
      relogio.avancar(100)
      call.streamLocal = new MidiaFalsa([trilha('mic-2')]) as never
      volumes.set('mic-2', 0.5)
      relogio.avancar(100)
      expect([...fala.falando.value]).toEqual([7])
    } finally {
      relogio.restaurar()
    }
  })
})

describe('diagramas Mermaid', () => {
  // A biblioteca de verdade não roda no happy-dom: a falsa responde como ela
  const renderizados: { id: string; tema: string }[] = []
  let tema = ''
  mock.module('mermaid', () => ({
    default: {
      initialize: (opcoes: { theme: string; securityLevel: string }) => { tema = `${opcoes.theme}/${opcoes.securityLevel}` },
      parse: async (codigo: string) => !codigo.includes('inválido'),
      render: async (id: string, codigo: string) => {
        renderizados.push({ id, tema })
        if (codigo.includes('quebra')) {
          const sobra = document.createElement('div')
          sobra.id = `d${id}`
          document.body.appendChild(sobra)
          throw new Error('render')
        }
        return { svg: `<svg data-codigo="${codigo}"></svg>` }
      },
    },
  }))

  test('reconhece a linguagem', () => {
    expect(ehLinguagemMermaid('Mermaid')).toBe(true)
    expect(ehLinguagemMermaid('ts')).toBe(false)
    expect(ehLinguagemMermaid()).toBe(false)
  })

  test('troca os blocos válidos pelo diagrama, no tema da tela e sem scripts', async () => {
    const html = '<p>antes</p><pre><code class="language-mermaid">graph A</code></pre><pre><code class="language-mermaid">inválido</code></pre>'
    const resultado = await substituirMermaidNoHtml(html, true)
    expect(resultado).toBe('<p>antes</p><div><svg data-codigo="graph A"></svg></div><pre><code class="language-mermaid">inválido</code></pre>')
    expect(renderizados.at(-1)!.tema).toBe('dark/strict')
    expect(await renderizarMermaid('graph B', false)).toBe('<svg data-codigo="graph B"></svg>')
    expect(renderizados.at(-1)!.tema).toBe('default/strict')
  })

  test('HTML sem bloco mermaid volta igual', async () => {
    expect(await substituirMermaidNoHtml('<p>oi</p>', false)).toBe('<p>oi</p>')
  })

  test('erro ao desenhar: null e sem sobras no documento', async () => {
    expect(await renderizarMermaid('quebra', false)).toBeNull()
    expect(document.getElementById(`d${renderizados.at(-1)!.id}`)).toBeNull()
  })
})
