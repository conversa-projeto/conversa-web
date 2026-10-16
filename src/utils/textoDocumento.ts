import { partesXml } from './fontesOffice'

// Texto dos documentos da base de conhecimento, tirado aqui no navegador (o
// servidor recebe só o texto): .txt, .md e .csv como estão, .pdf pelo pdf.js
// (o mesmo do visualizador) e .docx pelo XML do Word
export const EXTENSOES_DOCUMENTO = ['txt', 'md', 'markdown', 'csv', 'pdf', 'docx']

export function extensaoDocumento(nome: string) {
  return (nome.split('.').pop() ?? '').toLowerCase()
}

export async function textoDoDocumento(arquivo: File): Promise<string> {
  const extensao = extensaoDocumento(arquivo.name)
  if (extensao === 'pdf') return textoDoPdf(await arquivo.arrayBuffer())
  if (extensao === 'docx') return textoDoWord(await arquivo.arrayBuffer())
  if (EXTENSOES_DOCUMENTO.includes(extensao)) return arquivo.text()
  throw new Error(`Formato não aceito: .${extensao} (use ${EXTENSOES_DOCUMENTO.map((e) => `.${e}`).join(', ')}).`)
}

async function textoDoPdf(dados: ArrayBuffer) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(dados) }).promise
  const paginas: string[] = []
  for (let numero = 1; numero <= pdf.numPages; numero++) {
    const conteudo = await (await pdf.getPage(numero)).getTextContent()
    paginas.push(conteudo.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : '')).join(''))
  }
  await pdf.cleanup()
  return paginas.join('\n\n')
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// Cada parágrafo do Word (<w:p>) vira um parágrafo do texto; tabulação e
// quebra de linha dentro dele são mantidas
export async function textoDoWord(dados: ArrayBuffer) {
  const [xml] = await partesXml(dados, (nome) => nome === 'word/document.xml')
  if (!xml) throw new Error('Não foi possível ler o documento do Word.')
  const paragrafos: string[] = []
  for (const [paragrafo] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const texto = [...paragrafo.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(tab|br)\b[^>]*\/>/g)]
      .map((m) => (m[2] === 'tab' ? '\t' : m[2] === 'br' ? '\n' : m[1]!))
      .join('')
      .replace(/&(amp|lt|gt|quot|apos);/g, (_, nome: string) => ENTIDADES[nome]!)
    if (texto.trim()) paragrafos.push(texto)
  }
  return paragrafos.join('\n\n')
}
