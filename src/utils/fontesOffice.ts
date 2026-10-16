// Fontes do visualizador do Office (VisualizadorOffice), hospedadas em
// public/fontes/office por scripts/baixar-fontes-office.ts. O @silurus/ooxml
// já põe a substituta depois da fonte original (Calibri, "Carlito"...): basta a
// fonte estar carregada antes de desenhar. Só as que o documento usa são
// carregadas.

// Família no Google Fonts e os pesos baixados (cada um também em itálico)
export const FONTES_OFFICE: Record<string, number[]> = {
  'Carlito': [400, 700],
  'Caladea': [400, 700],
  'Libre Franklin': [400, 600, 700],
  'Open Sans': [400, 700],
  'Roboto': [400, 700],
  'Lato': [400, 700],
  'Montserrat': [400, 700],
  'Poppins': [400, 700],
  'Raleway': [400, 700],
  'Nunito': [400, 700],
  'Nunito Sans': [400, 700],
  'Playfair Display': [400, 700],
  'Ubuntu': [400, 700],
}

// Fonte do Office que usa outra família no lugar (as mesmas da biblioteca)
const SUBSTITUTAS: Record<string, string> = {
  'calibri': 'Carlito',
  'calibri light': 'Carlito',
  'cambria': 'Caladea',
  'cambria math': 'Caladea',
  'franklin gothic book': 'Libre Franklin',
  'franklin gothic medium': 'Libre Franklin',
}

const PROCURADAS: [string, string][] = [
  ...Object.entries(SUBSTITUTAS),
  ...Object.keys(FONTES_OFFICE).map((familia): [string, string] => [familia.toLowerCase(), familia]),
]

// Partes do pacote onde as fontes aparecem; planilhas e textos compartilhados
// do Excel ficam de fora (grandes e sem fonte: a do Excel fica em styles.xml)
function parteComFonte(nome: string) {
  return nome.endsWith('.xml') && !/^xl\/(worksheets|sharedStrings)/.test(nome)
}

const LIMITE_PARTE = 8 * 1024 * 1024

// O arquivo do Office é um ZIP: lê o diretório central e descompacta as partes
// XML com o DecompressionStream do navegador. O filtro escolhe as partes (a
// base de conhecimento lê o texto do Word em word/document.xml)
export async function partesXml(arquivo: ArrayBuffer, filtro: (nome: string) => boolean = parteComFonte): Promise<string[]> {
  const dados = new DataView(arquivo)
  let fim = arquivo.byteLength - 22
  while (fim >= 0 && dados.getUint32(fim, true) !== 0x06054b50) fim--
  if (fim < 0) return []
  const total = dados.getUint16(fim + 10, true)
  let posicao = dados.getUint32(fim + 16, true)
  const decodificador = new TextDecoder()
  const partes: Promise<string>[] = []
  for (let i = 0; i < total && dados.getUint32(posicao, true) === 0x02014b50; i++) {
    const metodo = dados.getUint16(posicao + 10, true)
    const compactado = dados.getUint32(posicao + 20, true)
    const tamanho = dados.getUint32(posicao + 24, true)
    const tamanhoNome = dados.getUint16(posicao + 28, true)
    const local = dados.getUint32(posicao + 42, true)
    const nome = decodificador.decode(new Uint8Array(arquivo, posicao + 46, tamanhoNome))
    posicao += 46 + tamanhoNome + dados.getUint16(posicao + 30, true) + dados.getUint16(posicao + 32, true)
    if (!filtro(nome) || tamanho > LIMITE_PARTE || (metodo !== 0 && metodo !== 8)) continue
    const inicio = local + 30 + dados.getUint16(local + 26, true) + dados.getUint16(local + 28, true)
    const bytes = new Uint8Array(arquivo, inicio, compactado)
    partes.push(metodo === 0
      ? Promise.resolve(decodificador.decode(bytes))
      : new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text())
  }
  return Promise.all(partes)
}

// Famílias hospedadas que o documento usa, já trocadas pelas substitutas
export async function fontesDoDocumento(arquivo: ArrayBuffer): Promise<string[]> {
  const texto = (await partesXml(arquivo)).join('\n').toLowerCase()
  const familias = new Set<string>()
  for (const [nome, familia] of PROCURADAS) {
    if (texto.includes(`"${nome}"`) || texto.includes(`'${nome}'`)) familias.add(familia)
  }
  return [...familias]
}

let folha: Promise<void> | null = null

function carregarFolha() {
  folha ??= new Promise<void>((resolver, rejeitar) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/fontes/office/fontes.css'
    link.onload = () => resolver()
    link.onerror = () => {
      folha = null
      link.remove()
      rejeitar(new Error('Falha ao carregar as fontes do Office'))
    }
    document.head.appendChild(link)
  })
  return folha
}

// Carrega as fontes que o documento usa; falhar não impede de abrir (o
// documento sai com as fontes do sistema)
export async function carregarFontesOffice(arquivo: ArrayBuffer) {
  try {
    const familias = await fontesDoDocumento(arquivo)
    if (!familias.length) return
    await carregarFolha()
    await Promise.all(familias.flatMap((familia) => (FONTES_OFFICE[familia] ?? []).flatMap((peso) =>
      ['normal', 'italic'].map((estilo) => document.fonts.load(`${estilo} ${peso} 16px "${familia}"`, 'aã')))))
  } catch {
    // segue com as fontes do sistema
  }
}
