import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

// Rodando no Dev Container (.devcontainer do backend), a pasta vem do Windows
// e nao avisa quando um arquivo muda: as mudancas sao detectadas por polling.
const NO_CONTAINER = Boolean(process.env.CONVERSA_DEV_CONTAINER)

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'chat-popup': resolve(__dirname, 'chat-popup.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('node_modules/sip.js')) {
            return 'sipjs'
          }

          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) {
            return 'framework'
          }

          if (id.includes('node_modules/highlight.js')) {
            return 'highlightjs'
          }

          if (id.includes('node_modules/hash-wasm')) {
            return 'vendor-utils'
          }

          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror') || id.includes('node_modules/@lezer')) {
            return 'codemirror'
          }
        }
      }
    }
  },
  // Em desenvolvimento o navegador fala com o nginx do backend (HTTPS na 443),
  // o mesmo de producao, que repassa a pagina para ca e /api, /ws, /storage e
  // /webrtc para os servicos. O Vite so atende o nginx, pela rede do Docker.
  server: command === 'serve'
    ? {
        host: true,
        port: 5173,
        strictPort: true,
        // O Host chega com o IP ou o nome usado no navegador.
        allowedHosts: true,
        // A recarga automatica usa a porta do nginx, nao a do Vite.
        hmr: { clientPort: 443 },
        watch: NO_CONTAINER ? { usePolling: true, interval: 300 } : undefined,
      }
    : undefined,
  preview: {
    host: true,
    port: 5173
  }
}))
