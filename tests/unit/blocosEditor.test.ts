import { describe, expect, test } from 'bun:test'
import { extrairBlocos } from '@/utils/blocosEditor'
import { editorVazio, ESPACO_INVISIVEL, type AnexoEditor } from '@/utils/editorRico'

function campo(html: string) {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

const anexo = (nomeArquivo: string, mimeType = 'image/png'): AnexoEditor => ({ blob: new Blob(['x'], { type: mimeType }), nomeArquivo, mimeType })
const resumo = (blocos: ReturnType<typeof extrairBlocos>) =>
  blocos.map((b) => ('texto' in b ? b.texto : 'figurinha' in b ? `figurinha:${b.figurinha}` : b.arquivo.nomeArquivo))

describe('extrair blocos do campo de mensagem', () => {
  test('texto, imagem, texto, áudio e figurinha, na ordem', () => {
    const anexos = new Map([['a1', anexo('tela.png')], ['a2', anexo('voz.webm', 'audio/webm')]])
    const html = 'Antes<span contenteditable="false" data-anexo="a1"></span>Meio<span data-anexo="a2"></span><span data-figurinha="basico/festa"></span>Fim'
    expect(resumo(extrairBlocos(campo(html), anexos))).toEqual(['Antes', 'tela.png', 'Meio', 'voz.webm', 'figurinha:basico/festa', 'Fim'])
  })

  test('menção fica dentro do texto, no formato @[Nome](id)', () => {
    const html = 'oi <span data-mencao-id="2" data-nome="Ana Souza">@Ana Souza</span>, tudo bem?'
    expect(extrairBlocos(campo(html), new Map())).toEqual([{ texto: 'oi @[Ana Souza](2), tudo bem?' }])
  })

  test('linhas do campo (div e br) viram quebras de linha', () => {
    const blocos = extrairBlocos(campo('linha 1<div>linha 2</div><div>linha 3<br>linha 4</div>'), new Map())
    expect(blocos).toEqual([{ texto: 'linha 1\nlinha 2\nlinha 3\nlinha 4' }])
  })

  test('peças em linhas próprias e linhas vazias em volta', () => {
    const anexos = new Map([['a', anexo('a.png')], ['b', anexo('b.png')]])
    const html = '<div>topo</div><div><span data-anexo="a"></span></div><div><br></div><div><span data-anexo="b"></span></div><div>fim</div>'
    expect(resumo(extrairBlocos(campo(html), anexos))).toEqual(['topo', 'a.png', 'b.png', 'fim'])
  })

  test('peça de anexo que não está mais no mapa é ignorada; vazio dá nada', () => {
    expect(extrairBlocos(campo('<span data-anexo="sumiu"></span>  '), new Map())).toEqual([])
  })

  test('o espaço invisível depois de cada bloco não vai no texto', () => {
    const anexos = new Map([['a', anexo('a.png')]])
    const html = `antes<span data-anexo="a"></span>${ESPACO_INVISIVEL}depois`
    expect(resumo(extrairBlocos(campo(html), anexos))).toEqual(['antes', 'a.png', 'depois'])
  })

  test('campo só com o espaço invisível conta como vazio', () => {
    expect(editorVazio(campo(ESPACO_INVISIVEL))).toBe(true)
    expect(editorVazio(campo(`${ESPACO_INVISIVEL}<span data-figurinha="basico/festa"></span>`))).toBe(false)
  })
})
