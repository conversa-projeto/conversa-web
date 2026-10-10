import { test as base, expect, type Browser, type Page } from '@playwright/test'
import type { Conta } from './contas'

// Cada pessoa num navegador próprio (processo separado: no mesmo processo, a
// câmera falsa de uma encerra a da outra), com as opções do playwright.config.
// O vídeo de cada janela fica em e2e/resultados. As conexões WebRTC da página
// ficam em window.__conexoes, para o teste medir o que chega.
// celular: tela de 390x844 com toque, como um smartphone
export const test = base.extend<{ abrirComo: (conta: Conta, opcoes?: { celular?: boolean }) => Promise<Page> }>({
  abrirComo: async ({ playwright, browserName, channel, headless, launchOptions, baseURL, viewport, ignoreHTTPSErrors }, use, testInfo) => {
    const navegadores: Browser[] = []
    await use(async (conta, opcoes = {}) => {
      const navegador = await playwright[browserName].launch({ ...launchOptions, channel, headless })
      navegadores.push(navegador)
      const tela = opcoes.celular ? { width: 390, height: 844 } : viewport
      const contexto = await navegador.newContext({
        baseURL,
        viewport: tela,
        ignoreHTTPSErrors,
        ...(opcoes.celular ? { isMobile: true, hasTouch: true } : {}),
        recordVideo: { dir: testInfo.outputPath(`video-${conta.login}`), size: tela ?? undefined },
      })
      await contexto.addInitScript(() => {
        const lista: RTCPeerConnection[] = []
        const Original = window.RTCPeerConnection
        ;(window as unknown as { __conexoes: RTCPeerConnection[] }).__conexoes = lista
        window.RTCPeerConnection = class extends Original {
          constructor(...args: ConstructorParameters<typeof RTCPeerConnection>) {
            super(...args)
            lista.push(this)
          }
        } as typeof RTCPeerConnection
      })
      const pagina = await contexto.newPage()
      await pagina.goto('/')
      await pagina.getByLabel('Usuário').fill(conta.login)
      await pagina.getByLabel('Senha').fill(conta.senha)
      await pagina.getByRole('button', { name: 'Entrar' }).click()
      await expect(pagina.getByPlaceholder('Pesquisar...').first()).toBeVisible()
      return pagina
    })
    for (const navegador of navegadores) {
      for (const contexto of navegador.contexts()) await contexto.close()
      await navegador.close()
    }
  },
})

export { expect }

export async function abrirConversa(pagina: Page, nome: string) {
  await pagina.locator('[role="button"]', { hasText: nome }).first().click()
  await expect(pagina.locator('h2', { hasText: nome })).toBeVisible()
}

export interface MidiaRecebida {
  audioBytes: number
  videoQuadros: number
  videoLargura: number
}

// Soma o que chegou por todas as conexões abertas (áudio em bytes, vídeo em quadros decodificados)
export function midiaRecebida(pagina: Page): Promise<MidiaRecebida> {
  return pagina.evaluate(async () => {
    const total = { audioBytes: 0, videoQuadros: 0, videoLargura: 0 }
    const conexoes = (window as unknown as { __conexoes: RTCPeerConnection[] }).__conexoes
    for (const pc of conexoes) {
      if (pc.connectionState === 'closed') continue
      const estatisticas = await pc.getStats()
      estatisticas.forEach((item: { type: string; kind?: string; bytesReceived?: number; framesDecoded?: number; frameWidth?: number }) => {
        if (item.type !== 'inbound-rtp') return
        if (item.kind === 'audio') total.audioBytes += item.bytesReceived ?? 0
        if (item.kind === 'video') {
          total.videoQuadros += item.framesDecoded ?? 0
          total.videoLargura = Math.max(total.videoLargura, item.frameWidth ?? 0)
        }
      })
    }
    return total
  })
}

// Espera a mídia continuar chegando: os números sobem entre duas leituras
export async function esperarMidiaChegando(pagina: Page, tipo: 'audio' | 'video') {
  const chave = tipo === 'audio' ? 'audioBytes' : 'videoQuadros'
  let anterior = (await midiaRecebida(pagina))[chave]
  await expect.poll(async () => {
    const atual = (await midiaRecebida(pagina))[chave]
    const subiu = atual > anterior
    anterior = atual
    return subiu
  }, { message: `${tipo} chegando`, intervals: [1000], timeout: 30_000 }).toBe(true)
}
