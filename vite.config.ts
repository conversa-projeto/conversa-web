import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

function devUrlPlugin(): Plugin {
  return {
    name: 'dev-url',
    configureServer(server) {
      const DEV_PORT = 4430
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        if (address && typeof address === 'object') {
          const host = address.address === '0.0.0.0' || address.address === '::' ? 'localhost' : address.address
          setTimeout(() => {
            console.log(`\n  \x1b[36m➜\x1b[0m  \x1b[1mAcesse via nginx:\x1b[0m \x1b[36mhttps://${host}:${DEV_PORT}/\x1b[0m\n`)
          }, 100)
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), devUrlPlugin()],
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

          if (id.includes('node_modules/vuesip') || id.includes('node_modules/jssip')) {
            return 'vuesip'
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
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 5173
  }
})
