import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { join, resolve } from 'node:path'

// Certificado de desenvolvimento e mkcert ficam no repositorio irmao do backend.
const BIN_BACKEND = resolve(__dirname, '../conversa/bin')
const CERT = join(BIN_BACKEND, 'cert', 'cert.pem')
const KEY = join(BIN_BACKEND, 'cert', 'key.pem')
const MKCERT = join(BIN_BACKEND, 'mkcert.exe')
const RENOVAR_ANTES_DIAS = 30

/**
 * Garante um certificado valido para localhost e para todos os IPv4 atuais da
 * maquina. Gera de novo com o mkcert quando ele falta, esta perto de vencer ou
 * nao cobre algum IP, o que acontece quando o DHCP troca o endereco.
 * A CA do mkcert precisa ter sido instalada uma vez pelo setup-cert.bat.
 */
function garantirCertificado() {
  const nomes = ['localhost', '127.0.0.1', ...ipsDaMaquina()]
  const motivo = motivoParaGerar(nomes)

  if (motivo) {
    if (!existsSync(MKCERT)) {
      throw new Error(`Certificado de desenvolvimento precisa ser gerado (${motivo}), mas ${MKCERT} nao existe. Rode o setup-cert.bat do backend.`)
    }
    const caroot = execFileSync(MKCERT, ['-CAROOT'], { encoding: 'utf8' }).trim()
    if (!existsSync(join(caroot, 'rootCA.pem'))) {
      throw new Error('A CA do mkcert nao esta instalada nesta maquina. Rode o setup-cert.bat do backend uma vez.')
    }
    execFileSync(MKCERT, ['-cert-file', CERT, '-key-file', KEY, ...nomes], { stdio: 'ignore' })
    console.log(`\n  Certificado de desenvolvimento gerado (${motivo}) para: ${nomes.join(', ')}\n`)
  }

  return { cert: readFileSync(CERT), key: readFileSync(KEY) }
}

function ipsDaMaquina(): string[] {
  const ips: string[] = []
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) {
        ips.push(i.address)
      }
    }
  }
  return ips
}

function motivoParaGerar(nomes: string[]): string | null {
  if (!existsSync(CERT) || !existsSync(KEY)) {
    return 'certificado ausente'
  }
  const x509 = new X509Certificate(readFileSync(CERT))
  if (new Date(x509.validTo).getTime() - Date.now() < RENOVAR_ANTES_DIAS * 24 * 60 * 60 * 1000) {
    return 'certificado perto de vencer'
  }
  const cobertos = new Set((x509.subjectAltName ?? '').split(', '))
  const faltando = nomes.filter(n => !cobertos.has(`DNS:${n}`) && !cobertos.has(`IP Address:${n}`))
  return faltando.length ? `sem ${faltando.join(', ')}` : null
}

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
  // Em desenvolvimento o Vite faz o papel do nginx de producao: HTTPS, exigido
  // pelo WebRTC fora de localhost, e os mesmos repasses. Porta 4430 para manter
  // o s3_endpoint e o endereco de acesso iguais aos de antes.
  server: command === 'serve'
    ? {
        host: true,
        port: 4430,
        strictPort: true,
        https: garantirCertificado(),
        proxy: {
          '/api/': { target: 'http://127.0.0.1:8080' },
          '/ws/': { target: 'http://127.0.0.1:9090', ws: true, rewrite: (p) => p.replace(/^\/ws/, '') },
          // Host original preservado (changeOrigin false): o MinIO valida a
          // assinatura da URL com o host que o navegador usou.
          '/storage/': { target: 'http://127.0.0.1:9000', changeOrigin: false, rewrite: (p) => p.replace(/^\/storage/, '') },
          '/webrtc/': { target: 'http://127.0.0.1:8889', rewrite: (p) => p.replace(/^\/webrtc/, '') }
        }
      }
    : undefined,
  preview: {
    host: true,
    port: 5173
  }
}))
