/**
 * Funções puras para detecção e parsing de blocos de código em mensagens.
 * Não depende de highlight.js — pode ser importado sem custo.
 */

export interface SegmentoTexto {
  tipo: 'texto' | 'codigo'
  conteudo: string
  linguagem?: string
}

// Abertura: 3 ou mais crases e a linguagem, seguidas de quebra de linha.
const ABERTURA = /(`{3,})(\w*)\n/g

interface Bloco {
  inicio: number
  fim: number
  linguagem: string
  conteudo: string
}

// Procura o fechamento do bloco aberto pela cerca de crases, com o código
// começando em posicao. Fecha numa linha só com crases (no mínimo tantas quanto
// a abertura) ou em crases no fim da mensagem. Crases no meio de uma linha, como
// em split('```'), fazem parte do código. Uma linha como ```javascript dentro
// do bloco abre um bloco interno (Markdown com exemplos de código), e a próxima
// linha de crases fecha esse interno, não o bloco de fora.
//
// Markdown costuma trazer exemplos abertos só com ``` (sem linguagem), que não
// dá para distinguir de um fechamento. Nele o bloco fecha na última linha de
// crases da mensagem. Mensagens novas nem chegam aqui: o app envia com uma cerca
// maior que as crases de dentro (cercaCodigo).
function fecharBloco(texto: string, posicao: number, cerca: string, linguagem: string): { conteudoFim: number; fim: number } | null {
  if (/^(md|markdown)$/i.test(linguagem)) {
    let ultimo: { conteudoFim: number; fim: number } | null = null
    let inicioLinha = posicao
    while (inicioLinha <= texto.length) {
      const quebra = texto.indexOf('\n', inicioLinha)
      const fimLinha = quebra < 0 ? texto.length : quebra
      const crases = texto.slice(inicioLinha, fimLinha).match(/^(`{3,})\s*$/)
      if (crases && crases[1].length >= cerca.length) {
        ultimo = { conteudoFim: Math.max(posicao, inicioLinha - 1), fim: fimLinha }
      }
      if (quebra < 0) break
      inicioLinha = quebra + 1
    }
    if (ultimo) return ultimo
  }

  let profundidade = 0
  let inicioLinha = posicao
  while (inicioLinha <= texto.length) {
    const quebra = texto.indexOf('\n', inicioLinha)
    const fimLinha = quebra < 0 ? texto.length : quebra
    const linha = texto.slice(inicioLinha, fimLinha)
    const crases = linha.match(/^(`{3,})(\w*)\s*$/)
    if (crases && crases[1].length >= cerca.length) {
      if (crases[2]) {
        profundidade++
      } else if (profundidade > 0) {
        profundidade--
      } else {
        return { conteudoFim: Math.max(posicao, inicioLinha - 1), fim: fimLinha }
      }
    }
    if (quebra < 0) break
    inicioLinha = quebra + 1
  }
  // Sem linha de fechamento: aceita as crases coladas no fim da mensagem.
  const final = texto.slice(posicao).match(new RegExp(`${cerca}\\s*$`))
  if (final && final.index !== undefined && final.index > 0) {
    return { conteudoFim: posicao + final.index, fim: texto.length }
  }
  return null
}

function encontrarBlocos(texto: string): Bloco[] {
  const blocos: Bloco[] = []
  const abertura = new RegExp(ABERTURA)
  let match: RegExpExecArray | null
  while ((match = abertura.exec(texto)) !== null) {
    const inicioCodigo = match.index + match[0].length
    const fechamento = fecharBloco(texto, inicioCodigo, match[1], match[2])
    if (!fechamento) continue
    blocos.push({
      inicio: match.index,
      fim: fechamento.fim,
      linguagem: match[2],
      conteudo: texto.slice(inicioCodigo, fechamento.conteudoFim),
    })
    abertura.lastIndex = fechamento.fim
  }
  return blocos
}

export function temCodigoFormatado(texto: string): boolean {
  return encontrarBlocos(texto).length > 0
}

export function removerBlocosCodigo(texto: string): string {
  return parseCodeBlocks(texto).filter((seg) => seg.tipo === 'texto').map((seg) => seg.conteudo).join('')
}

// Texto de uma linha para listas: cada bloco de código vira "Código (linguagem)".
export function resumirCodigo(texto: string): string {
  return parseCodeBlocks(texto)
    .map((seg) => seg.tipo === 'texto' ? seg.conteudo : ` Código${seg.linguagem ? ` (${seg.linguagem})` : ''} `)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

// Cerca para envolver um código: uma crase a mais que a maior sequência de
// crases dentro dele, com no mínimo três.
export function cercaCodigo(codigo: string): string {
  const maior = Math.max(0, ...(codigo.match(/`+/g) || []).map((s) => s.length))
  return '`'.repeat(Math.max(3, maior + 1))
}

export function parseCodeBlocks(texto: string): SegmentoTexto[] {
  const segmentos: SegmentoTexto[] = []
  let ultimo = 0
  for (const bloco of encontrarBlocos(texto)) {
    if (bloco.inicio > ultimo) {
      segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo, bloco.inicio) })
    }
    segmentos.push({ tipo: 'codigo', conteudo: bloco.conteudo, linguagem: bloco.linguagem || undefined })
    ultimo = bloco.fim
  }
  if (ultimo < texto.length) {
    segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo) })
  }
  return segmentos
}
