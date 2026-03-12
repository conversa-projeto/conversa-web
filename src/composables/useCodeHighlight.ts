import { ref, onUnmounted } from 'vue'
import hljs from 'highlight.js/lib/core'
import hljsJavascript from 'highlight.js/lib/languages/javascript'
import hljsTypescript from 'highlight.js/lib/languages/typescript'
import hljsPython from 'highlight.js/lib/languages/python'
import hljsSql from 'highlight.js/lib/languages/sql'
import hljsJson from 'highlight.js/lib/languages/json'
import hljsXml from 'highlight.js/lib/languages/xml'
import hljsCss from 'highlight.js/lib/languages/css'
import hljsBash from 'highlight.js/lib/languages/bash'
import hljsCsharp from 'highlight.js/lib/languages/csharp'
import hljsDelphi from 'highlight.js/lib/languages/delphi'

hljs.registerLanguage('plaintext', () => ({ name: 'Plain Text', contains: [] }))
hljs.registerLanguage('text', () => ({ name: 'Plain Text', contains: [] }))
hljs.registerLanguage('texto', () => ({ name: 'Plain Text', contains: [] }))
hljs.registerLanguage('plain', () => ({ name: 'Plain Text', contains: [] }))

hljs.registerLanguage('javascript', hljsJavascript)
hljs.registerLanguage('js', hljsJavascript)
hljs.registerLanguage('typescript', hljsTypescript)
hljs.registerLanguage('ts', hljsTypescript)
hljs.registerLanguage('python', hljsPython)
hljs.registerLanguage('py', hljsPython)
hljs.registerLanguage('sql', hljsSql)
hljs.registerLanguage('json', hljsJson)
hljs.registerLanguage('xml', hljsXml)
hljs.registerLanguage('html', hljsXml)
hljs.registerLanguage('css', hljsCss)
hljs.registerLanguage('bash', hljsBash)
hljs.registerLanguage('sh', hljsBash)
hljs.registerLanguage('csharp', hljsCsharp)
hljs.registerLanguage('cs', hljsCsharp)
hljs.registerLanguage('pascal', hljsDelphi)
hljs.registerLanguage('delphi', hljsDelphi)

export interface SegmentoTexto {
  tipo: 'texto' | 'codigo'
  conteudo: string
  linguagem?: string
}

export function temCodigoFormatado(texto: string): boolean {
  return /```\w*\n[\s\S]*?```/.test(texto)
}

export function parseCodeBlocks(texto: string): SegmentoTexto[] {
  const regex = /```(\w*)\n([\s\S]*?)```/g
  const segmentos: SegmentoTexto[] = []
  let ultimo = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimo) {
      segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo, match.index) })
    }
    segmentos.push({ tipo: 'codigo', conteudo: match[2], linguagem: match[1] || undefined })
    ultimo = match.index + match[0].length
  }
  if (ultimo < texto.length) {
    segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo) })
  }
  return segmentos
}

export function highlightCodigo(codigo: string, linguagem?: string): string {
  if (linguagem && hljs.getLanguage(linguagem)) {
    return hljs.highlight(codigo, { language: linguagem }).value
  }
  return hljs.highlightAuto(codigo).value
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
    temCodigoFormatado,
    parseCodeBlocks,
    highlightCodigo
  }
}
