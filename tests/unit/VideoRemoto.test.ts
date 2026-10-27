import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import VideoRemoto from '@/components/VideoRemoto.vue'
import { MidiaFalsa, TrilhaFalsa } from './webrtcFalso'

// O happy-dom não desenha vídeo: o teste entrega cada quadro na mão
type AoQuadro = (agora: number, quadro: { width: number; height: number }) => void
let pedidos: AoQuadro[] = []
let agora = 0
const srcObjectOriginal = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject')!
const playOriginal = HTMLMediaElement.prototype.play
const nowOriginal = performance.now.bind(performance)
const prototipo = HTMLVideoElement.prototype as unknown as Record<string, unknown>

function entregarQuadro(width = 640, height = 480) {
  const fila = pedidos
  pedidos = []
  fila.forEach((aoQuadro) => aoQuadro(agora, { width, height }))
}

let video: VueWrapper
function montar(props: { tela?: boolean } = {}) {
  const trilha = new TrilhaFalsa('video')
  video = mount(VideoRemoto, { props: { stream: new MidiaFalsa([trilha]) as never, ...props } })
  return trilha
}
const conectando = () => video.find('[role="status"]').exists()

beforeEach(() => {
  pedidos = []
  agora = 0
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', { configurable: true, get: () => null, set: () => {} })
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  prototipo.requestVideoFrameCallback = (aoQuadro: AoQuadro) => pedidos.push(aoQuadro)
  prototipo.cancelVideoFrameCallback = () => {}
  performance.now = () => agora
})
afterEach(() => {
  video?.unmount()
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', srcObjectOriginal)
  HTMLMediaElement.prototype.play = playOriginal
  delete prototipo.requestVideoFrameCallback
  delete prototipo.cancelVideoFrameCallback
  performance.now = nowOriginal
})

describe('vídeo de um participante', () => {
  test('mostra "Conectando o vídeo..." até o primeiro quadro, e de novo se a transmissão para', async () => {
    const trilha = montar()
    expect(video.text()).toContain('Conectando o vídeo...')
    entregarQuadro()
    await video.vm.$nextTick()
    expect(conectando()).toBe(false)
    trilha.dispatchEvent(new Event('mute'))
    await video.vm.$nextTick()
    expect(conectando()).toBe(true)
    entregarQuadro()
    await video.vm.$nextTick()
    expect(conectando()).toBe(false)
  })

  test('outra transmissão (assinatura nova) volta a mostrar o conectando', async () => {
    montar()
    entregarQuadro()
    await video.vm.$nextTick()
    await video.setProps({ stream: new MidiaFalsa([new TrilhaFalsa('video')]) as never })
    expect(conectando()).toBe(true)
  })

  test('tela compartilhada: avisa que foi vista quando o quadro muda de tamanho, uma vez', async () => {
    montar()
    entregarQuadro(640, 480)
    Object.defineProperties(video.find('video').element, { videoWidth: { value: 640 }, videoHeight: { value: 480 } })
    await video.setProps({ tela: true })
    // Quadro da câmera ainda a caminho
    entregarQuadro(640, 480)
    expect(video.emitted('telaVista')).toBeUndefined()
    entregarQuadro(1920, 1080)
    entregarQuadro(1920, 1080)
    expect(video.emitted('telaVista')).toHaveLength(1)
  })

  test('tela do mesmo tamanho da câmera: avisa depois de um segundo recebendo', async () => {
    montar()
    entregarQuadro(1280, 720)
    Object.defineProperties(video.find('video').element, { videoWidth: { value: 1280 }, videoHeight: { value: 720 } })
    await video.setProps({ tela: true })
    agora = 999
    entregarQuadro(1280, 720)
    expect(video.emitted('telaVista')).toBeUndefined()
    agora = 1000
    entregarQuadro(1280, 720)
    expect(video.emitted('telaVista')).toHaveLength(1)
  })

  test('aberto já com a tela compartilhada (entrou depois): o primeiro quadro avisa', () => {
    montar({ tela: true })
    entregarQuadro(1920, 1080)
    expect(video.emitted('telaVista')).toHaveLength(1)
  })

  test('navegador sem aviso de quadro: sem o conectando, e a tela conta como vista', async () => {
    delete prototipo.requestVideoFrameCallback
    montar({ tela: true })
    await video.vm.$nextTick()
    expect(conectando()).toBe(false)
    expect(video.emitted('telaVista')).toHaveLength(1)
  })
})
