import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { nomeVariavelCor, useCoresPersonalizadas, GRUPOS_CORES } from '@/composables/useCoresPersonalizadas'
import { useHistoryNavigation } from '@/composables/useHistoryNavigation'
import { galeriaDasMensagens, useImageViewer, type ItemGaleria } from '@/composables/useImageViewer'
import { TipoConteudo } from '@/types/api'
import { conteudo, mensagem, texto } from './fabrica'
import { useUploadProgress } from '@/composables/useUploadProgress'
import { carregarMarkdown, ehLinguagemMarkdown } from '@/composables/useMarkdown'
import { desregistrarAudio, registrarAudio } from '@/composables/useAudioManager'
import { useConexao } from '@/composables/useConexao'
import { relogioFalso } from './relogioFalso'
import { aguardar } from './apiFalsa'

describe('tema', () => {
  test('alternar liga o escuro na página e lembra a escolha', () => {
    const { isDark, toggle } = useTheme()
    const antes = isDark.value
    toggle()
    expect(isDark.value).toBe(!antes)
    expect(document.documentElement.classList.contains('dark')).toBe(!antes)
    expect(localStorage.getItem('theme')).toBe(!antes ? 'dark' : 'light')
    toggle()
    expect(document.documentElement.classList.contains('dark')).toBe(antes)
  })
})

describe('cores personalizadas', () => {
  const estilo = () => document.getElementById('conversa-cores-personalizadas')!.textContent

  test('cor escolhida vale só no tema dela e fica salva', () => {
    const { definirCor, restaurarCores } = useCoresPersonalizadas()
    definirCor('claro', nomeVariavelCor('primary', '600'), '#123456')
    definirCor('escuro', '--color-surface-base', '#000000')
    expect(estilo()).toBe('html:not(.dark){--color-primary-600:#123456;}html.dark{--color-surface-base:#000000;}')
    expect(JSON.parse(localStorage.getItem('conversa.cores')!)).toEqual({ claro: { '--color-primary-600': '#123456' }, escuro: { '--color-surface-base': '#000000' } })
    restaurarCores('claro', ['--color-primary-600'])
    expect(estilo()).toBe('html.dark{--color-surface-base:#000000;}')
    restaurarCores('escuro')
    expect(estilo()).toBe('')
  })

  test('outra janela do app mudou as cores: aplica aqui também', () => {
    localStorage.setItem('conversa.cores', JSON.stringify({ claro: { '--color-info-300': '#abcdef' } }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'conversa.cores' }))
    expect(estilo()).toContain('--color-info-300:#abcdef')
    useCoresPersonalizadas().restaurarCores('claro')
  })

  test('cada tom listado explica onde aparece', () => {
    for (const grupo of GRUPOS_CORES) {
      expect(grupo.tons.length).toBeGreaterThan(0)
      for (const tom of grupo.tons) expect(tom.uso.length).toBeGreaterThan(10)
    }
  })
})

describe('navegação pelo histórico do navegador', () => {
  function irPara(caminho: string, estado: object | null = null) {
    window.history.replaceState(estado, '', caminho)
  }

  test.each([
    ['/chat/12', { secao: 'chat', conversaId: 12, abaConfig: null }],
    ['/chat', { secao: 'chat', conversaId: null, abaConfig: null }],
    ['/anexos/3', { secao: 'anexos', conversaId: 3, abaConfig: null }],
    ['/config/cores', { secao: 'config', conversaId: null, abaConfig: 'cores' }],
    ['/config/invalida', { secao: 'config', conversaId: null, abaConfig: 'usuario' }],
    ['/chamadas', { secao: 'chamadas', conversaId: null, abaConfig: null }],
    ['/qualquer-coisa', { secao: 'chat', conversaId: null, abaConfig: null }],
  ])('abrir %s', (caminho, esperado) => {
    irPara(caminho)
    const nav = useHistoryNavigation()
    nav.inicializar()
    expect(nav.estadoAtual.value).toMatchObject(esperado)
  })

  test('trocar de conversa cria entrada; mesma conversa só atualiza', () => {
    irPara('/chat/1')
    const nav = useHistoryNavigation()
    nav.inicializar()
    const tamanho = window.history.length
    nav.pushEstado({ conversaId: 2 })
    expect(window.location.pathname).toBe('/chat/2')
    expect(window.history.length).toBe(tamanho + 1)
    nav.pushEstado({ conversaId: 2 })
    expect(window.history.length).toBe(tamanho + 1)
  })

  test('fora do chat e dos anexos não guarda conversa; fora da config não guarda aba', () => {
    irPara('/chat/1')
    const nav = useHistoryNavigation()
    nav.inicializar()
    nav.pushEstado({ secao: 'config', abaConfig: 'cores' })
    expect(window.location.pathname).toBe('/config/cores')
    expect(nav.estadoAtual.value.conversaId).toBeNull()
    nav.pushEstado({ secao: 'chamadas' })
    expect(nav.estadoAtual.value.abaConfig).toBeNull()
  })

  test('guardar a posição da rolagem sem criar entrada', () => {
    irPara('/chat/1')
    const nav = useHistoryNavigation()
    nav.inicializar()
    nav.replaceEstado({ ancora: { mensagemId: 9, offset: 30 } })
    expect(window.history.state.ancora).toEqual({ mensagemId: 9, offset: 30 })
  })

  test('voltar chama o retorno com o estado, e as mudanças que ele fizer não criam entradas', async () => {
    const relogio = relogioFalso()
    try {
      irPara('/chat/1')
      const nav = useHistoryNavigation()
      nav.inicializar()
      const recebidos: unknown[] = []
      const parar = nav.aoVoltarAvancar((estado) => {
        recebidos.push(estado)
        expect(nav.estaNavegandoPorHistorico()).toBe(true)
        const antes = window.history.length
        nav.pushEstado({ conversaId: 99 })
        expect(window.history.length).toBe(antes)
      })
      irPara('/chat/7', { secao: 'chat', conversaId: 7, abaConfig: null, ancora: { mensagemId: 3, offset: 0 } })
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
      await aguardar()
      expect(recebidos).toEqual([{ secao: 'chat', conversaId: 7, abaConfig: null, ancora: { mensagemId: 3, offset: 0 } }])
      relogio.avancar(0)
      expect(nav.estaNavegandoPorHistorico()).toBe(false)
      parar()
    } finally {
      relogio.restaurar()
    }
  })
})

describe('galeria do visualizador: imagens e vídeos da conversa', () => {
  test('na ordem das mensagens, com o texto junto; vídeo marcado; outros arquivos e excluídas fora', () => {
    const galeria = galeriaDasMensagens([
      mensagem({ id: 1, conteudos: [conteudo(TipoConteudo.Imagem, 'img-1', { nome: 'praia.png' }), texto(' Olha ')] }),
      mensagem({ id: 2, conteudos: [conteudo(TipoConteudo.Arquivo, 'vid-1', { nome: 'festa.MP4' })] }),
      mensagem({ id: 3, conteudos: [conteudo(TipoConteudo.Arquivo, 'doc-1', { nome: 'contrato.pdf' })] }),
      mensagem({ id: 4, excluida_em: new Date(), conteudos: [conteudo(TipoConteudo.Imagem, 'img-x')] }),
      mensagem({ id: 5, conteudos: [conteudo(TipoConteudo.Arquivo, 'vid-2', { extensao: 'webm' })] }),
    ])
    expect(galeria).toEqual([
      { identificador: 'img-1', nome: 'praia.png', legenda: 'Olha' },
      { identificador: 'vid-1', nome: 'festa.MP4', legenda: '', video: true },
      { identificador: 'vid-2', nome: 'Vídeo', legenda: '', video: true },
    ])
  })
})

describe('visualizador de imagem (zoom, arrasto, galeria)', () => {
  function criar(galeria: ItemGaleria[] = [{ identificador: 'a', nome: 'A' }, { identificador: 'b', nome: 'B' }]) {
    const urls = ref<Record<string, string>>({})
    const garantir = async (id: string) => void (urls.value[id] = `https://localhost/storage/${id}`)
    let visor!: ReturnType<typeof useImageViewer>
    const host = mount(defineComponent({ setup() { visor = useImageViewer(garantir, urls, ref(galeria)); return () => h('div') } }))
    return { visor, host }
  }

  test('abrir, fechar e travar a rolagem da página enquanto aberto', async () => {
    const { visor, host } = criar()
    await visor.abrirImagemTelaCheia('a', 'A')
    expect(visor.imagemTelaCheiaUrl.value).toBe('https://localhost/storage/a')
    await aguardar()
    expect(document.body.style.overflow).toBe('hidden')
    visor.fecharImagemTelaCheia()
    await aguardar()
    expect(document.body.style.overflow).toBe('')
    host.unmount()
  })

  test('o passo do zoom cresce com o zoom, entre 0,1 e 30', () => {
    const { visor, host } = criar()
    visor.ajustarZoomImagem(1)
    expect(visor.zoomImagemTelaCheia.value).toBe(1.2)
    for (let i = 0; i < 20; i++) visor.ajustarZoomImagem(-1)
    expect(visor.zoomImagemTelaCheia.value).toBe(0.1)
    for (let i = 0; i < 80; i++) visor.ajustarZoomImagem(1)
    expect(visor.zoomImagemTelaCheia.value).toBe(30)
    host.unmount()
  })

  test('arrastar só com zoom; voltar a 100% centraliza', () => {
    const { visor, host } = criar()
    visor.iniciarArrasto(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }))
    expect(visor.isDragging.value).toBe(false)
    visor.ajustarZoomImagem(1)
    visor.iniciarArrasto(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }))
    visor.processarArrasto(new MouseEvent('mousemove', { clientX: 40, clientY: 25 }))
    visor.finalizarArrasto()
    expect([visor.translateX.value, visor.translateY.value]).toEqual([30, 15])
    visor.resetarZoomComTransicao()
    expect([visor.zoomImagemTelaCheia.value, visor.translateX.value, visor.transicaoAtiva.value]).toEqual([1, 0, true])
    host.unmount()
  })

  test('setas navegam na galeria, Esc fecha, + e - fazem zoom', async () => {
    const { visor, host } = criar()
    await visor.abrirImagemTelaCheia('a', 'A')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await aguardar()
    expect(visor.imagemAtualIdentificador.value).toBe('b')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await aguardar()
    expect(visor.imagemAtualIdentificador.value).toBe('b')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await aguardar()
    expect(visor.imagemAtualIdentificador.value).toBe('a')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))
    expect(visor.zoomImagemTelaCheia.value).toBe(1.2)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }))
    expect(visor.zoomImagemTelaCheia.value).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(visor.imagemTelaCheiaAberta.value).toBe(false)
    host.unmount()
  })

  test('vídeo aberto: sem zoom; com o player em foco, as setas ficam para o vídeo', async () => {
    const { visor, host } = criar([{ identificador: 'a', nome: 'A' }, { identificador: 'v', nome: 'V', video: true }, { identificador: 'c', nome: 'C' }])
    await visor.abrirImagemTelaCheia('v', 'V')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))
    expect(visor.zoomImagemTelaCheia.value).toBe(1)
    const player = document.createElement('video')
    document.body.appendChild(player)
    player.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await aguardar()
    expect(visor.imagemAtualIdentificador.value).toBe('v')
    player.remove()
    // Fora do player, as setas navegam entre imagens e vídeos
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await aguardar()
    expect(visor.imagemAtualIdentificador.value).toBe('c')
    host.unmount()
  })

  test('imagem direta (fila de envio) usa a galeria dela no lugar da conversa', () => {
    const { visor, host } = criar()
    visor.abrirImagemDireta('blob:1', 'Nova', 'n1', [{ identificador: 'n1', nome: 'Nova' }])
    expect(visor.galeriaOverride.value).toEqual([{ identificador: 'n1', nome: 'Nova' }])
    visor.fecharImagemTelaCheia()
    expect(visor.galeriaOverride.value).toBeNull()
    host.unmount()
  })
})

describe('progresso de upload', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => {
    useUploadProgress().limparTodos()
    relogio.restaurar()
  })

  test('só mostra o indicador se depois de 2 s ainda não passou da metade', () => {
    const { iniciarUpload, mostrarIndicador } = useUploadProgress()
    const progresso = iniciarUpload('lento', 'grande.zip')
    progresso(20)
    relogio.avancar(2000)
    expect(mostrarIndicador.value).toBe(true)
  })

  test('upload rápido não mostra o indicador', () => {
    const { iniciarUpload, finalizarUpload, mostrarIndicador, temUploadAtivo } = useUploadProgress()
    const progresso = iniciarUpload('rapido', 'foto.png')
    progresso(80)
    relogio.avancar(2000)
    expect(mostrarIndicador.value).toBe(false)
    finalizarUpload('rapido')
    expect(temUploadAtivo.value).toBe(false)
  })
})

describe('Markdown nas mensagens', () => {
  test('reconhece md e markdown', () => {
    expect([ehLinguagemMarkdown('MD'), ehLinguagemMarkdown('markdown'), ehLinguagemMarkdown('ts'), ehLinguagemMarkdown()]).toEqual([true, true, false, false])
  })

  // A limpeza feita pelo DOMPurify (tirar script, links em outra aba) não dá
  // para verificar aqui: no happy-dom ele se diz disponível, mas limpa errado
  // (remove <h1> e mantém <script>). No navegador funciona; conferir lá.
  test('formata o Markdown', async () => {
    const renderizar = await carregarMarkdown()
    expect(renderizar('**negrito** e _itálico_')).toContain('<strong>negrito</strong>')
    expect(await carregarMarkdown()).toBe(renderizar)
  })
})

describe('um áudio por vez', () => {
  test('tocar outro pausa o anterior', () => {
    // Elementos <audio> de verdade: o Vue não os envolve em proxy, como no app
    const pausados: string[] = []
    const audio = (nome: string) => {
      const el = document.createElement('audio')
      el.pause = () => void pausados.push(nome)
      return el
    }
    const a = audio('a')
    const b = audio('b')
    registrarAudio(a)
    registrarAudio(b)
    expect(pausados).toEqual(['a'])
    desregistrarAudio(b)
    registrarAudio(a)
    expect(pausados).toEqual(['a'])
    desregistrarAudio(a)
  })
})

describe('conexão lenta', () => {
  test('sem a informação da rede, considera rápida', () => {
    expect(useConexao().conexaoLenta.value).toBe(false)
  })
})
