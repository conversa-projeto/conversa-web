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
      const crases = texto.slice(inicioLinha, fimLinha).match(/^(`{3,})\s*$/)?.[1]
      if (crases && crases.length >= cerca.length) {
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
    const [, crases, linguagemInterna] = linha.match(/^(`{3,})(\w*)\s*$/) ?? []
    if (crases && crases.length >= cerca.length) {
      if (linguagemInterna) {
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
    const [inteiro, cerca = '', linguagem = ''] = match
    const inicioCodigo = match.index + inteiro.length
    const fechamento = fecharBloco(texto, inicioCodigo, cerca, linguagem)
    if (!fechamento) continue
    blocos.push({
      inicio: match.index,
      fim: fechamento.fim,
      linguagem,
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

// Desenho com caracteres de caixa (├── │ ┌─┐) ou bordas ASCII (+---+, | x |)
const DESENHO_ASCII = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝]|^\s*[+|].*[+|]\s*$/

// Linha com cara de código: termina em ; { } ), tem =>, começa com palavra
// reservada comum, tag HTML, indentação ou é parte de um desenho ASCII
const LINHA_CODIGO = /[;{}]\s*$|\)\s*$|=>|^\s*[}\])]|^\s*(import|export|from|const|let|var|function|return|class|def|public|private|protected|static|if|else|elif|for|foreach|while|switch|case|try|catch|using|namespace|package|#include|select|insert|update|delete|create|alter|begin|end|procedure|with)\b|^\s*<\/?[a-zA-Z][\w-]*|^( {2,}|\t)/i

// Sinal que texto comum quase não tem, para uma lista indentada não virar código
const SINAL_FORTE = /[{};]|=>|\w\([^)]*\)|<\/[a-zA-Z][\w-]*>|^\s*(def|function|class|import|select|from)\b/im

// Comando de terminal no começo da linha (cd, npm, docker, git...)
const COMANDO_TERMINAL = /^\s*(\$\s+)?(cd|ls|npm|npx|node|docker|git|sudo|apt|curl|chmod|mkdir|rm|cp|mv|psql)\s/

// Texto colado que parece código: duas ou mais linhas, metade delas com cara
// de código e algum sinal forte (ou um desenho ASCII, ou comandos de terminal)
export function pareceCodigo(texto: string): boolean {
  if (/^`{3}/m.test(texto)) return false
  const linhas = texto.split('\n').filter((linha) => linha.trim())
  if (linhas.length < 2) return false
  const desenho = linhas.filter((linha) => DESENHO_ASCII.test(linha)).length
  if (desenho / linhas.length >= 0.5) return true
  const comandos = linhas.filter((linha) => COMANDO_TERMINAL.test(linha)).length
  if (comandos / linhas.length >= 0.5) return true
  const comCara = linhas.filter((linha) => LINHA_CODIGO.test(linha) || COMANDO_TERMINAL.test(linha)).length
  return comCara >= 2 && comCara / linhas.length >= 0.5 && SINAL_FORTE.test(texto)
}

// Texto colado longo demais para uma mensagem comum: sugere inserir como código.
// Vale também com blocos ``` dentro (Markdown, texto de outro chat): a cerca
// externa fica maior que as de dentro (cercaCodigo).
export function textoLongo(texto: string): boolean {
  return texto.trim().split('\n').length > 10
}

export function ehDesenhoAscii(texto: string): boolean {
  return texto.split('\n').some((linha) => DESENHO_ASCII.test(linha))
}
