import { describe, expect, test } from 'bun:test'
import { fontesDoDocumento } from '../../src/utils/fontesOffice'
import { textoDoDocumento, textoDoWord } from '../../src/utils/textoDocumento'

// ZIP mínimo (sem CRC: a leitura não confere), com as partes compactadas ou não
function zip(partes: [string, string, boolean][]): ArrayBuffer {
  const codificador = new TextEncoder()
  const locais: Uint8Array[] = []
  const centrais: Uint8Array[] = []
  let deslocamento = 0
  for (const [nome, texto, compactar] of partes) {
    const nomeBytes = codificador.encode(nome)
    const original = codificador.encode(texto)
    const dados = compactar ? Bun.deflateSync(original) : original
    const local = new Uint8Array(30 + nomeBytes.length + dados.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(8, compactar ? 8 : 0, true)
    vl.setUint32(18, dados.length, true)
    vl.setUint32(22, original.length, true)
    vl.setUint16(26, nomeBytes.length, true)
    local.set(nomeBytes, 30)
    local.set(dados, 30 + nomeBytes.length)
    const central = new Uint8Array(46 + nomeBytes.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true)
    vc.setUint16(10, compactar ? 8 : 0, true)
    vc.setUint32(20, dados.length, true)
    vc.setUint32(24, original.length, true)
    vc.setUint16(28, nomeBytes.length, true)
    vc.setUint32(42, deslocamento, true)
    central.set(nomeBytes, 46)
    locais.push(local)
    centrais.push(central)
    deslocamento += local.length
  }
  const tamanhoCentral = centrais.reduce((soma, c) => soma + c.length, 0)
  const fim = new Uint8Array(22)
  const vf = new DataView(fim.buffer)
  vf.setUint32(0, 0x06054b50, true)
  vf.setUint16(8, partes.length, true)
  vf.setUint16(10, partes.length, true)
  vf.setUint32(12, tamanhoCentral, true)
  vf.setUint32(16, deslocamento, true)
  const tudo = new Uint8Array(deslocamento + tamanhoCentral + 22)
  let posicao = 0
  for (const parte of [...locais, ...centrais, fim]) {
    tudo.set(parte, posicao)
    posicao += parte.length
  }
  return tudo.buffer
}

describe('fontesDoDocumento', () => {
  test('troca as fontes do Office pelas substitutas e acha as do Google', async () => {
    const arquivo = zip([
      ['word/fontTable.xml', '<w:font w:name="Calibri"/><w:font w:name="Cambria Math"/>', true],
      ['word/document.xml', '<w:rFonts w:ascii="Open Sans"/>', false],
    ])
    expect((await fontesDoDocumento(arquivo)).sort()).toEqual(['Caladea', 'Carlito', 'Open Sans'])
  })

  test('não confunde nome parecido nem lê as planilhas do Excel', async () => {
    const arquivo = zip([
      ['xl/styles.xml', '<font><name val="Calibri Sans"/></font><font><name val="Lato Light"/></font>', true],
      ['xl/worksheets/sheet1.xml', '<c t="inlineStr"><is><t>"Roboto"</t></is></c>', true],
    ])
    expect(await fontesDoDocumento(arquivo)).toEqual([])
  })

  test('arquivo que não é ZIP não tem fontes', async () => {
    expect(await fontesDoDocumento(new TextEncoder().encode('não é zip').buffer as ArrayBuffer)).toEqual([])
  })
})

describe('texto do Word para a base de conhecimento', () => {
  test('cada parágrafo vira um parágrafo, com tabulação, quebra de linha e entidades', async () => {
    const documento = '<?xml version="1.0"?><w:document><w:body>'
      + '<w:p><w:r><w:t>Política de férias</w:t></w:r></w:p>'
      + '<w:p w:rsidR="1"><w:r><w:t xml:space="preserve">Prazo: </w:t></w:r><w:r><w:t>45 dias</w:t><w:tab/><w:t>&amp; aprovação</w:t><w:br/><w:t>do gestor</w:t></w:r></w:p>'
      + '<w:p><w:pPr/></w:p>'
      + '</w:body></w:document>'
    const arquivo = zip([['word/styles.xml', '<w:styles/>', true], ['word/document.xml', documento, true]])
    expect(await textoDoWord(arquivo)).toBe('Política de férias\n\nPrazo: 45 dias\t& aprovação\ndo gestor')
  })

  test('sem o document.xml avisa', async () => {
    await expect(textoDoWord(zip([['word/styles.xml', '<w:styles/>', false]]))).rejects.toThrow('Não foi possível ler o documento do Word.')
  })

  test('texto puro vai como está; formato desconhecido é recusado', async () => {
    expect(await textoDoDocumento(new File(['Linha 1\n\nLinha 2'], 'notas.md'))).toBe('Linha 1\n\nLinha 2')
    await expect(textoDoDocumento(new File(['x'], 'planilha.xlsx'))).rejects.toThrow('Formato não aceito: .xlsx')
  })
})
