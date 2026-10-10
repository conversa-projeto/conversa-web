import { defineConfig } from '@playwright/test'
import { arquivoDaCamera } from './e2e/camera'

// Testes de ponta a ponta (e2e/*.e2e.ts): o app inteiro, no ambiente local do
// Docker (https://localhost, nginx + API + MinIO + MediaMTX), com dois
// navegadores fazendo de duas pessoas. Roda pelo Node (o Bun no Windows não
// abre o navegador do Playwright):
//   bun run e2e        escondido
//   bun run e2e:ver    com as janelas à vista e mais devagar
//
// Usa o Edge do Windows: o Chromium baixado pelo Playwright não abre com
// janela nesta máquina. Câmera e microfone são falsos (um vídeo de teste,
// e2e/camera.ts, e um bipe) e a tela compartilhada é escolhida sozinha.
const verNaTela = process.argv.includes('--headed')

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/preparar.ts',
  outputDir: 'e2e/resultados',
  // Cada teste usa as mesmas contas: um por vez
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e/relatorio', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_URL ?? 'https://localhost',
    ignoreHTTPSErrors: true,
    channel: 'msedge',
    headless: !verNaTela,
    viewport: { width: 1100, height: 760 },
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: verNaTela ? 250 : 0,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${arquivoDaCamera()}`,
        '--auto-select-desktop-capture-source=Entire screen',
        // Sem foco, o navegador não deixa a outra janela "parada"
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    },
  },
})
