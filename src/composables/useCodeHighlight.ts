import { ref, onUnmounted } from 'vue'

export { temCodigoFormatado, parseCodeBlocks } from '../utils/codeBlocks'
export type { SegmentoTexto } from '../utils/codeBlocks'

// highlight.js é carregado sob demanda — só quando uma mensagem com código é renderizada.
// Enquanto não carrega, highlightCodigo retorna texto escapado (sem cores).
// Quando carrega, hljsReady muda para true → Vue re-renderiza e aplica syntax highlighting.

let hljsInstance: {
  registerLanguage: (name: string, lang: any) => void
  getLanguage: (name: string) => any
  highlight: (code: string, options: { language: string }) => { value: string }
  highlightAuto: (code: string) => { value: string }
} | null = null

let hljsPromise: Promise<void> | null = null
const hljsReady = ref(false)

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function carregarHljs() {
  if (hljsInstance) return
  if (hljsPromise) { await hljsPromise; return }
  hljsPromise = (async () => {
    const [
      mod, js, ts, py, sqlLang, jsonLang, xml, cssLang, bash, cs, delphi
    ] = await Promise.all([
      import('highlight.js/lib/core'),
      import('highlight.js/lib/languages/javascript'),
      import('highlight.js/lib/languages/typescript'),
      import('highlight.js/lib/languages/python'),
      import('highlight.js/lib/languages/sql'),
      import('highlight.js/lib/languages/json'),
      import('highlight.js/lib/languages/xml'),
      import('highlight.js/lib/languages/css'),
      import('highlight.js/lib/languages/bash'),
      import('highlight.js/lib/languages/csharp'),
      import('highlight.js/lib/languages/delphi'),
    ])

    const hljs = mod.default

    hljs.registerLanguage('plaintext', () => ({ name: 'Plain Text', contains: [] }))
    hljs.registerLanguage('text', () => ({ name: 'Plain Text', contains: [] }))
    hljs.registerLanguage('texto', () => ({ name: 'Plain Text', contains: [] }))
    hljs.registerLanguage('plain', () => ({ name: 'Plain Text', contains: [] }))

    hljs.registerLanguage('javascript', js.default)
    hljs.registerLanguage('js', js.default)
    hljs.registerLanguage('typescript', ts.default)
    hljs.registerLanguage('ts', ts.default)
    hljs.registerLanguage('python', py.default)
    hljs.registerLanguage('py', py.default)
    hljs.registerLanguage('sql', sqlLang.default)
    hljs.registerLanguage('json', jsonLang.default)
    hljs.registerLanguage('xml', xml.default)
    hljs.registerLanguage('html', xml.default)
    hljs.registerLanguage('css', cssLang.default)
    hljs.registerLanguage('bash', bash.default)
    hljs.registerLanguage('sh', bash.default)
    hljs.registerLanguage('csharp', cs.default)
    hljs.registerLanguage('cs', cs.default)
    hljs.registerLanguage('pascal', delphi.default)
    hljs.registerLanguage('delphi', delphi.default)

    hljsInstance = hljs
    hljsReady.value = true
  })()
  await hljsPromise
}

export function highlightCodigo(codigo: string, linguagem?: string): string {
  // Acessar hljsReady.value para que Vue rastreie a dependência reativa.
  // Quando hljs terminar de carregar, o componente re-renderiza automaticamente.
  if (!hljsReady.value || !hljsInstance) {
    void carregarHljs()
    return escapeHtml(codigo)
  }

  if (linguagem && hljsInstance.getLanguage(linguagem)) {
    return hljsInstance.highlight(codigo, { language: linguagem }).value
  }
  return hljsInstance.highlightAuto(codigo).value
}

export function useCodeHighlight() {
  const codigosCopiados = ref<Set<string>>(new Set())
  const timers: number[] = []

  async function copiarCodigo(codigo: string, chave: string) {
    try {
      await navigator.clipboard.writeText(codigo)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = codigo
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }

    codigosCopiados.value = new Set([...codigosCopiados.value, chave])
    const timer = window.setTimeout(() => {
      const updated = new Set(codigosCopiados.value)
      updated.delete(chave)
      codigosCopiados.value = updated
    }, 2000)
    timers.push(timer)
  }

  onUnmounted(() => {
    for (const t of timers) window.clearTimeout(t)
    timers.length = 0
  })

  return {
    codigosCopiados,
    copiarCodigo,
    highlightCodigo
  }
}
