import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import AudioPlayerArquivo from '@/components/AudioPlayerArquivo.vue'
import AudioPlayerGravacao from '@/components/AudioPlayerGravacao.vue'
import BarraGravacao from '@/components/BarraGravacao.vue'
import { useAudioRecording } from '@/composables/useAudioRecording'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { aparelhos, instalarWebrtcFalso, TrilhaFalsa } from './webrtcFalso'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('player de áudio', () => {
  // O <audio> do happy-dom não toca: play e pause disparam os eventos como o
  // navegador, e a duração vem do teste
  function prepararAudio(tela: VueWrapper, duracao = 90) {
    const audio = tela.find('audio').element as HTMLAudioElement
    Object.defineProperty(audio, 'duration', { value: duracao, configurable: true })
    audio.play = () => { audio.dispatchEvent(new Event('play')); return Promise.resolve() }
    audio.pause = () => void audio.dispatchEvent(new Event('pause'))
    return audio
  }

  test('pelo identificador: busca o endereço, toca, marca como ouvida uma vez e pausa', async () => {
    rota('GET', '/anexo', { url: 'https://localhost/storage/audio' })
    rota('POST', '/mensagem/reproduzir', { sucesso: true })
    const tela = montar(AudioPlayerArquivo, { props: { identificador: 'aud-1', conversaId: 3, mensagemId: 9, nome: 'reuniao.mp3' } })
    const audio = prepararAudio(tela)
    expect(tela.text()).toContain('reuniao.mp3')
    expect(tela.find('button').classes()).toContain('text-success-500')
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(audio.src).toBe('https://localhost/storage/audio')
    expect(pedidosDe('POST', '/mensagem/reproduzir')[0]!.corpo).toEqual({ conversa: 3, mensagem: 9 })
    expect(tela.find('button').classes()).not.toContain('text-success-500')
    await tela.find('button').trigger('click')
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
    expect(pedidosDe('POST', '/mensagem/reproduzir')).toHaveLength(1)
  })

  test('duração e progresso; ao terminar volta ao início', async () => {
    const tela = montar(AudioPlayerGravacao, { props: { src: 'blob:gravacao', isOwn: true } })
    const audio = prepararAudio(tela, 80)
    await tela.find('audio').trigger('loadedmetadata')
    expect(tela.text()).toContain('01:20')
    audio.currentTime = 20
    await tela.find('audio').trigger('timeupdate')
    expect(tela.text()).toContain('00:20')
    expect((tela.find('.absolute.inset-y-0').element as HTMLElement).style.width).toBe('25%')
    await tela.find('audio').trigger('ended')
    expect(tela.text()).toContain('01:20')
    // Minha própria gravação não aparece como "não ouvida"
    expect(tela.find('button').classes()).not.toContain('text-success-500')
  })

  test('duração só conhecida durante a reprodução também serve', async () => {
    const tela = montar(AudioPlayerGravacao, { props: { src: 'blob:x' } })
    const audio = prepararAudio(tela, 40)
    audio.currentTime = 10
    await tela.find('audio').trigger('timeupdate')
    expect((tela.find('.absolute.inset-y-0').element as HTMLElement).style.width).toBe('25%')
  })

  test('arrastar na barra muda a posição (só depois de carregado)', async () => {
    const tela = montar(AudioPlayerGravacao, { props: { src: 'blob:x' } })
    const audio = prepararAudio(tela, 100)
    const barra = tela.find('.cursor-pointer').element as HTMLElement
    barra.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, bottom: 6, right: 200, height: 6, x: 0, y: 0, toJSON: () => ({}) })
    barra.setPointerCapture = () => {}
    barra.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50 }))
    expect(audio.currentTime).toBe(0)
    await tela.find('button').trigger('click')
    barra.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50 }))
    expect(audio.currentTime).toBe(25)
    barra.dispatchEvent(new PointerEvent('pointermove', { clientX: 500 }))
    expect(audio.currentTime).toBe(100)
    barra.dispatchEvent(new PointerEvent('pointerup'))
    barra.dispatchEvent(new PointerEvent('pointermove', { clientX: 0 }))
    expect(audio.currentTime).toBe(100)
  })

  test('tocar um áudio pausa o outro', async () => {
    const a = montar(AudioPlayerGravacao, { props: { src: 'blob:a' } })
    const b = montar(AudioPlayerGravacao, { props: { src: 'blob:b' } })
    prepararAudio(a)
    const audioB = prepararAudio(b)
    await b.find('button').trigger('click')
    const pausado = mock(() => {})
    audioB.pause = pausado
    await a.find('button').trigger('click')
    await aguardar()
    expect(pausado).toHaveBeenCalledTimes(1)
  })

  test('endereço indisponível não toca', async () => {
    rota('GET', '/anexo', erro(404, 'Anexo não encontrado'))
    const tela = montar(AudioPlayerArquivo, { props: { identificador: 'sumiu', nome: '' } })
    const audio = prepararAudio(tela)
    const tocar = mock(() => Promise.resolve())
    audio.play = tocar
    await tela.find('button').trigger('click')
    await aguardar(5)
    expect(tocar).not.toHaveBeenCalled()
    expect(tela.find('button').attributes('disabled')).toBeUndefined()
  })

  test('sem endereço nem identificador não toca', async () => {
    const tela = montar(AudioPlayerGravacao, {})
    const audio = prepararAudio(tela)
    const tocar = mock(() => Promise.resolve())
    audio.play = tocar
    await tela.find('button').trigger('click')
    expect(tocar).not.toHaveBeenCalled()
  })
})

describe('gravação de áudio', () => {
  class GravadorFalso {
    static ultimo: GravadorFalso
    state: 'inactive' | 'recording' | 'paused' = 'inactive'
    mimeType: string
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    constructor(public stream: unknown) {
      this.mimeType = GravadorFalso.mime
      GravadorFalso.ultimo = this
    }
    static mime = 'audio/webm;codecs=opus'
    start() { this.state = 'recording' }
    pause() { this.state = 'paused' }
    resume() { this.state = 'recording' }
    stop() { this.state = 'inactive'; this.onstop?.() }
    falar(texto: string) { this.ondataavailable?.({ data: new Blob([texto]) }) }
  }

  let prontos: { blob: Blob; nome: string; mime: string }[]
  let gravacao: ReturnType<typeof useAudioRecording>
  let erroGravacao: ReturnType<typeof ref<string>>

  function montarGravador() {
    prontos = []
    const Teste = defineComponent({
      setup() {
        erroGravacao = ref('')
        gravacao = useAudioRecording(erroGravacao as never, (blob, nome, mime) => prontos.push({ blob, nome, mime }))
        return () => h('div')
      },
    })
    return montar(Teste)
  }

  beforeEach(() => {
    instalarWebrtcFalso()
    GravadorFalso.mime = 'audio/webm;codecs=opus'
    Object.assign(window, { MediaRecorder: GravadorFalso, isSecureContext: true })
  })
  afterEach(() => {
    delete (window as { MediaRecorder?: unknown }).MediaRecorder
    delete (window as { isSecureContext?: unknown }).isSecureContext
  })

  test('grava, pausa, retoma e entrega o áudio ao parar; o microfone é liberado', async () => {
    montarGravador()
    await gravacao.iniciarAudio()
    expect(gravacao.gravandoAudio.value).toBe(true)
    const gravador = GravadorFalso.ultimo
    const trilha = (gravador.stream as { getTracks: () => TrilhaFalsa[] }).getTracks()[0]!
    gravador.falar('olá')
    gravacao.pausarAudio()
    expect(gravacao.pausado.value).toBe(true)
    expect(gravacao.obterPreviewBlob()!.size).toBe(4)
    gravacao.pausarAudio()
    gravacao.retomarAudio()
    expect(gravador.state).toBe('recording')
    gravador.falar('!')
    gravacao.pararAudio()
    expect(prontos).toHaveLength(1)
    expect(prontos[0]!.nome).toMatch(/^audio-\d+\.webm$/)
    expect(prontos[0]!.blob.size).toBe(5)
    expect(trilha.readyState).toBe('ended')
    expect(gravacao.gravandoAudio.value).toBe(false)
  })

  test('ogg vira .ogg', async () => {
    GravadorFalso.mime = 'audio/ogg'
    montarGravador()
    await gravacao.iniciarAudio()
    GravadorFalso.ultimo.falar('x')
    gravacao.pararAudio()
    expect(prontos[0]!.nome).toMatch(/\.ogg$/)
  })

  test('descartar não entrega nada; gravação vazia também não', async () => {
    montarGravador()
    await gravacao.iniciarAudio()
    GravadorFalso.ultimo.falar('x')
    gravacao.descartarAudio()
    await gravacao.iniciarAudio()
    gravacao.pararAudio()
    expect(prontos).toEqual([])
    expect(gravacao.obterPreviewBlob()).toBeNull()
  })

  test('sem HTTPS, sem suporte ou sem microfone: explica o motivo', async () => {
    montarGravador()
    Object.assign(window, { isSecureContext: false })
    await gravacao.iniciarAudio()
    expect(erroGravacao.value).toBe('Para gravar áudio por navegador, use HTTPS (ou localhost).')
    Object.assign(window, { isSecureContext: true, MediaRecorder: undefined })
    await gravacao.iniciarAudio()
    expect(erroGravacao.value).toBe('Gravação de áudio não suportada neste navegador.')
    Object.assign(window, { MediaRecorder: GravadorFalso })
    aparelhos.microfone = false
    await gravacao.iniciarAudio()
    expect(erroGravacao.value).toBeTruthy()
    expect(gravacao.gravandoAudio.value).toBe(false)
  })

  test('ações fora de hora não fazem nada; sair da tela libera o microfone', async () => {
    const tela = montarGravador()
    gravacao.pausarAudio()
    gravacao.retomarAudio()
    gravacao.pararAudio()
    gravacao.descartarAudio()
    await gravacao.iniciarAudio()
    await gravacao.iniciarAudio()
    const trilha = (GravadorFalso.ultimo.stream as { getTracks: () => TrilhaFalsa[] }).getTracks()[0]!
    gravacao.retomarAudio()
    tela.unmount()
    montados.splice(montados.indexOf(tela), 1)
    expect(trilha.readyState).toBe('ended')
  })
})

describe('barra de gravação', () => {
  const props = { pausado: false, tempoFormatado: '00:07', reproduzindoPreview: false, previewProgresso: 0 }

  test('gravando: tempo, ondas, pausar, descartar e enviar', async () => {
    const tela = montar(BarraGravacao, { props })
    expect(tela.text()).toContain('00:07')
    expect(tela.findAll('.waveform-bar')).toHaveLength(20)
    expect(tela.find('button[title="Ouvir gravação"]').exists()).toBe(false)
    await tela.find('button[title="Pausar gravação"]').trigger('click')
    await tela.find('button[title="Descartar"]').trigger('click')
    await tela.find('button[title="Enviar áudio"]').trigger('click')
    expect(Object.keys(tela.emitted())).toEqual(expect.arrayContaining(['pausar', 'descartar', 'enviar']))
  })

  test('pausada: ouvir, progresso, pular para um ponto e continuar', async () => {
    const tela = montar(BarraGravacao, { props: { ...props, pausado: true, previewProgresso: 40 } })
    await tela.find('button[title="Ouvir gravação"]').trigger('click')
    expect(tela.emitted('toggle-preview')).toHaveLength(1)
    expect((tela.find('.bg-primary-500').element as HTMLElement).style.width).toBe('40%')
    const barra = tela.find('.cursor-pointer.h-5')
    ;(barra.element as HTMLElement).getBoundingClientRect = () => ({ left: 100, width: 200, top: 0, bottom: 20, right: 300, height: 20, x: 100, y: 0, toJSON: () => ({}) })
    await barra.trigger('click', { clientX: 150 })
    await barra.trigger('click', { clientX: 900 })
    expect(tela.emitted('seek')).toEqual([[0.25], [1]])
    await tela.find('button[title="Continuar gravação"]').trigger('click')
    expect(tela.emitted('retomar')).toHaveLength(1)
    await tela.setProps({ reproduzindoPreview: true })
    expect(tela.find('button[title="Parar preview"]').exists()).toBe(true)
  })
})

describe('sons e notificações do sistema', () => {
  // Cada teste pega uma cópia nova do módulo: ele guarda o service worker e as
  // notificações abertas
  let copia = 0
  const carregar = () => import(`../../src/utils/sound.ts?copia=${++copia}`) as Promise<typeof import('@/utils/sound')>

  class NotificacaoFalsa {
    static permission = 'granted'
    static criadas: NotificacaoFalsa[] = []
    static requestPermission = mock(async () => 'granted')
    onclick: (() => void) | null = null
    onclose: (() => void) | null = null
    fechada = false
    constructor(public titulo: string, public opcoes: NotificationOptions) { NotificacaoFalsa.criadas.push(this) }
    close() { this.fechada = true }
  }

  function comServiceWorker(registro: object | null) {
    Object.defineProperty(navigator, 'serviceWorker', { value: { getRegistrations: async () => (registro ? [registro] : []) }, configurable: true })
  }

  beforeEach(() => {
    NotificacaoFalsa.permission = 'granted'
    NotificacaoFalsa.criadas = []
    Object.assign(window, { Notification: NotificacaoFalsa })
  })
  afterEach(() => {
    delete (window as { Notification?: unknown }).Notification
    delete (navigator as { serviceWorker?: unknown }).serviceWorker
  })

  test('sem service worker: notificação da página, uma por conversa, substituída a cada mensagem', async () => {
    const som = await carregar()
    const cliques: number[] = []
    som.showNotification(1, 'Bruno', { body: 'oi' }, () => cliques.push(1))
    await aguardar()
    som.showNotification(1, 'Bruno', { body: 'tudo bem?' })
    await aguardar()
    const [primeira, segunda] = NotificacaoFalsa.criadas
    expect(primeira!.fechada).toBe(true)
    expect(primeira!.onclose).toBeNull()
    expect(segunda!.opcoes).toMatchObject({ body: 'tudo bem?', tag: 'conversa-1', renotify: true, requireInteraction: true, silent: true })
    som.fecharNotificacao(1)
    expect(segunda!.fechada).toBe(true)
  })

  test('clicar foca a janela, fecha e chama a ação', async () => {
    const som = await carregar()
    const foco = mock(() => {})
    const focoOriginal = window.focus
    window.focus = foco
    const acao = mock(() => {})
    som.showNotification(2, 'Carla', { body: 'x' }, acao)
    await aguardar()
    NotificacaoFalsa.criadas[0]!.onclick!()
    window.focus = focoOriginal
    expect(foco).toHaveBeenCalled()
    expect(acao).toHaveBeenCalled()
    expect(NotificacaoFalsa.criadas[0]!.fechada).toBe(true)
  })

  test('fechar uma notificação antiga não apaga a nova', async () => {
    const som = await carregar()
    som.showNotification(3, 'A', { body: '1' })
    await aguardar()
    const antiga = NotificacaoFalsa.criadas[0]!
    const oncloseAntiga = antiga.onclose!
    som.showNotification(3, 'A', { body: '2' })
    await aguardar()
    oncloseAntiga()
    som.fecharNotificacao(3)
    expect(NotificacaoFalsa.criadas[1]!.fechada).toBe(true)
    NotificacaoFalsa.criadas[1]!.onclose!()
  })

  test('sem permissão, não notifica', async () => {
    const som = await carregar()
    NotificacaoFalsa.permission = 'denied'
    som.showNotification(1, 'x')
    await aguardar()
    expect(NotificacaoFalsa.criadas).toEqual([])
  })

  test('com o service worker do push: a notificação sai por ele, com a conversa nos dados', async () => {
    const mostradas: [string, NotificationOptions][] = []
    const abertas = [{ close: mock(() => {}) }]
    const registro = {
      active: { scriptURL: 'https://localhost/firebase-messaging-sw.js' },
      showNotification: async (titulo: string, opcoes: NotificationOptions) => void mostradas.push([titulo, opcoes]),
      getNotifications: async ({ tag }: { tag: string }) => (tag === 'conversa-4' ? abertas : []),
      update: mock(async () => {}),
    }
    comServiceWorker(registro)
    const som = await carregar()
    som.atualizarServiceWorkerNotificacoes()
    som.showNotification(4, 'Davi', { body: 'olá' })
    await aguardar(5)
    expect(registro.update).toHaveBeenCalled()
    expect(mostradas).toEqual([['Davi', expect.objectContaining({ body: 'olá', tag: 'conversa-4', data: { conversa: 4 } })]])
    expect(NotificacaoFalsa.criadas).toEqual([])
    som.fecharNotificacao(4)
    await aguardar(5)
    expect(abertas[0]!.close).toHaveBeenCalled()
  })

  test('service worker que falha ao notificar cai na notificação da página', async () => {
    comServiceWorker({ active: { scriptURL: 'https://localhost/firebase-messaging-sw.js' }, showNotification: async () => { throw new Error('x') } })
    const som = await carregar()
    som.showNotification(5, 'Eva', { body: 'x' })
    await aguardar(5)
    expect(NotificacaoFalsa.criadas).toHaveLength(1)
  })

  test('outro service worker não serve', async () => {
    comServiceWorker({ active: { scriptURL: 'https://localhost/outro-sw.js' } })
    const som = await carregar()
    expect(await som.obterRegistroNotificacoes()).toBeNull()
  })

  test('pedir permissão só quando ainda não foi decidido', async () => {
    const som = await carregar()
    NotificacaoFalsa.permission = 'default'
    expect(await som.requestNotificationPermission()).toBe('granted')
    NotificacaoFalsa.permission = 'denied'
    expect(await som.requestNotificationPermission()).toBe('denied')
    expect(NotificacaoFalsa.requestPermission).toHaveBeenCalledTimes(1)
    delete (window as { Notification?: unknown }).Notification
    expect(await som.requestNotificationPermission()).toBe('denied')
  })

  test('som de notificação; se o arquivo não tocar, um bipe', async () => {
    const som = await carregar()
    const tocados: string[] = []
    const bipes: number[] = []
    class AudioQueFalha {
      currentTime = 5
      constructor(public src: string) {}
      play() { tocados.push(this.src); return Promise.reject(new Error('autoplay')) }
    }
    class ContextoFalso {
      state = 'suspended'
      currentTime = 0
      destination = {}
      resume = mock(async () => { this.state = 'running' })
      createOscillator() { return { connect: () => {}, type: '', frequency: { setValueAtTime: (f: number) => bipes.push(f) }, start: () => {}, stop: () => {} } }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } } }
    }
    Object.assign(globalThis, { Audio: AudioQueFalha, AudioContext: ContextoFalso })
    try {
      som.playNotificationSound()
      await aguardar(5)
      som.playNotificationSound()
      await aguardar(5)
      expect(tocados).toEqual(['/notification.mp3', '/notification.mp3'])
      expect(bipes).toEqual([880, 880])
    } finally {
      instalarWebrtcFalso()
    }
  })
})
