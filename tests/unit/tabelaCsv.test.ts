import { describe, expect, test } from 'bun:test'
import { marked } from 'marked'
import { ehLinguagemTabela, lerTabela, pareceTabela, separadorCsv, tabelaParaMarkdown } from '@/utils/tabelaCsv'

const EXEMPLO = [
  'Teste\tResultado',
  '9998 liga para o 9996 registrado com o sip.js 0.21 (o do app)\t486 Busy Here depois de ~7 s',
  '9996 liga para o *43\tatende normalmente',
].join('\n')

describe('lerTabela', () => {
  test('separa linhas e células e ignora linhas vazias', () => {
    expect(lerTabela('a;b\r\n\nc;d\n', ';')).toEqual([['a', 'b'], ['c', 'd']])
  })

  test('respeita aspas, aspas duplas e quebra de linha dentro delas', () => {
    expect(lerTabela('"x;y";"com ""aspas"""\n"duas\nlinhas";z', ';')).toEqual([
      ['x;y', 'com "aspas"'],
      ['duas\nlinhas', 'z'],
    ])
  })
})

describe('separadorCsv', () => {
  test('ponto e vírgula do Excel em português', () => {
    expect(separadorCsv('nome;valor\nA;1,5\nB;2,25')).toBe(';')
  })

  test('vírgula', () => {
    expect(separadorCsv('nome,valor\nA,1\nB,2')).toBe(',')
  })
})

describe('tabelaParaMarkdown', () => {
  test('cabeçalho, linhas curtas completadas e números à direita', () => {
    expect(tabelaParaMarkdown('item,qtd\nA,1\nB', 'csv')).toBe('| item | qtd |\n| --- | ---: |\n| A | 1 |\n| B |  |')
  })

  test('caracteres de Markdown aparecem como são', () => {
    const html = marked.parse(tabelaParaMarkdown(EXEMPLO, 'tsv'), { async: false, gfm: true })
    expect(html).toContain('<th>Teste</th>')
    expect(html).toContain('9996 liga para o *43')
    expect(html).not.toContain('<em>')
    expect((html.match(/<tr>/g) ?? []).length).toBe(3)
  })

  test('barra vertical e quebra de linha na célula', () => {
    const md = tabelaParaMarkdown('a\tb\n"x|y\nz"\t<b>', 'tsv')
    const html = marked.parse(md, { async: false, gfm: true })
    expect(html).toContain('x|y<br>z')
    expect(html).toContain('&lt;b&gt;')
  })
})

describe('pareceTabela', () => {
  test('texto com tabs copiado do Excel vira tsv', () => {
    expect(pareceTabela(EXEMPLO + '\n')).toEqual({ linguagem: 'tsv', tabela: EXEMPLO })
  })

  test('csv com ; ou vírgula', () => {
    expect(pareceTabela('nome;idade\nAna;30')?.linguagem).toBe('csv')
    expect(pareceTabela('nome,idade\nAna,30')?.linguagem).toBe('csv')
  })

  test('não pega frases, uma linha só, colunas diferentes nem código', () => {
    expect(pareceTabela('Oi, tudo bem?\nSim, e você?')).toBeNull()
    expect(pareceTabela('a\tb')).toBeNull()
    expect(pareceTabela('a\tb\nc')).toBeNull()
    expect(pareceTabela('const a = f(x,y);\nconst b = g(z,w);')).toBeNull()
    expect(pareceTabela('linha um\nlinha dois')).toBeNull()
  })
})

test('ehLinguagemTabela', () => {
  expect(ehLinguagemTabela('CSV')).toBe(true)
  expect(ehLinguagemTabela('tsv')).toBe(true)
  expect(ehLinguagemTabela('md')).toBe(false)
  expect(ehLinguagemTabela()).toBe(false)
})
