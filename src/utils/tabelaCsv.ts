import { pareceCodigo } from './codeBlocks'

// Tabelas CSV e TSV nas mensagens: o bloco ```csv / ```tsv guarda os dados
// originais (é o que o "Copiar" copia) e aparece como tabela, montada em
// Markdown e desenhada pelo mesmo renderizador dos blocos ```md.

export function ehLinguagemTabela(linguagem?: string) {
  const valor = (linguagem || '').toLowerCase()
  return valor === 'csv' || valor === 'tsv'
}

// Linhas e células, respeitando as aspas do CSV: "a;b", "com ""aspas""" e
// quebra de linha dentro de aspas (o Excel copia assim a célula com Enter).
// Linhas vazias ficam de fora.
export function lerTabela(texto: string, separador: string): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let celula = ''
  let aspas = false
  let inicioCelula = true
  const fecharLinha = () => {
    linha.push(celula)
    if (linha.some((c) => c.trim())) linhas.push(linha)
    linha = []
    celula = ''
    inicioCelula = true
  }
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        celula += '"'
        i++
      } else if (c === '"') aspas = false
      else celula += c
      continue
    }
    if (c === '"' && inicioCelula) {
      aspas = true
      inicioCelula = false
    } else if (c === separador) {
      linha.push(celula)
      celula = ''
      inicioCelula = true
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fecharLinha()
    } else {
      celula += c
      inicioCelula = false
    }
  }
  if (celula || linha.length) fecharLinha()
  return linhas
}

// Todas as linhas com o mesmo número de colunas, no mínimo duas
function colunasIguais(linhas: string[][]) {
  const colunas = linhas[0]?.length ?? 0
  return colunas >= 2 && linhas.every((l) => l.length === colunas)
}

// Separador do CSV: o ; (Excel em português) ou a vírgula, o que der as
// mesmas colunas em todas as linhas; empate fica com o que der mais colunas.
export function separadorCsv(texto: string): string {
  const pontoEVirgula = lerTabela(texto, ';')
  const virgula = lerTabela(texto, ',')
  const okPv = colunasIguais(pontoEVirgula)
  const okV = colunasIguais(virgula)
  if (okPv !== okV) return okPv ? ';' : ','
  return (pontoEVirgula[0]?.length ?? 0) >= (virgula[0]?.length ?? 0) ? ';' : ','
}

function separadorDa(linguagem: string, texto: string) {
  return linguagem.toLowerCase() === 'tsv' ? '\t' : separadorCsv(texto)
}

// Texto da célula sem virar formatação: * _ [ ] < | etc. aparecem como são
function escaparCelula(celula: string) {
  return celula.trim()
    .replace(/[\\`*_[\]<>|~&]/g, '\\$&')
    .replace(/\r?\n/g, '<br>')
}

const NUMERO = /^[-+]?(R\$\s*)?\d[\d.,\s]*%?$/

// Tabela em Markdown (GFM): a primeira linha é o cabeçalho, linhas curtas
// ganham células vazias e coluna só de números fica alinhada à direita.
export function tabelaParaMarkdown(texto: string, linguagem: string): string {
  const linhas = lerTabela(texto, separadorDa(linguagem, texto))
  const colunas = Math.max(0, ...linhas.map((l) => l.length))
  if (!colunas) return ''
  const completar = (l: string[]) => [...l, ...Array<string>(colunas - l.length).fill('')]
  const [cabecalho = [], ...corpo] = linhas.map(completar)
  const alinhamento = cabecalho.map((_, i) => {
    const valores = corpo.map((l) => l[i]!.trim()).filter(Boolean)
    return valores.length && valores.every((v) => NUMERO.test(v)) ? '---:' : '---'
  })
  const linhaMd = (l: string[]) => `| ${l.map(escaparCelula).join(' | ')} |`
  return [linhaMd(cabecalho), `| ${alinhamento.join(' | ')} |`, ...corpo.map(linhaMd)].join('\n')
}

// Texto colado que é uma tabela: duas linhas ou mais, todas com o mesmo número
// de colunas (no mínimo duas). Tab é o que vem do Excel, do Sheets e de tabelas
// de páginas. Com ; ou vírgula, nenhuma célula pode começar com espaço, para
// frases como "Oi, tudo bem?" não virarem tabela, nem pode parecer código.
export function pareceTabela(texto: string): { linguagem: 'csv' | 'tsv'; tabela: string } | null {
  const tabela = texto.replace(/^(\s*\n)+|\s+$/g, '')
  if (!tabela.includes('\n')) return null
  if (tabela.includes('\t')) {
    const linhas = lerTabela(tabela, '\t')
    return linhas.length >= 2 && colunasIguais(linhas) ? { linguagem: 'tsv', tabela } : null
  }
  if (/^`{3}/m.test(tabela) || pareceCodigo(tabela)) return null
  const separador = separadorCsv(tabela)
  const linhas = lerTabela(tabela, separador)
  if (linhas.length < 2 || !colunasIguais(linhas)) return null
  if (linhas.some((l) => l.some((c) => /^\s/.test(c)))) return null
  return { linguagem: 'csv', tabela }
}
