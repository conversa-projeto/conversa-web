/**
 * Funções puras para detecção e parsing de blocos de código em mensagens.
 * Não depende de highlight.js — pode ser importado sem custo.
 */

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
