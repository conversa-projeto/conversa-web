import { describe, expect, test } from 'bun:test'
import { cercaCodigo, ehDesenhoAscii, parseCodeBlocks, pareceCodigo, removerBlocosCodigo, resumirCodigo, temCodigoFormatado } from '@/utils/codeBlocks'

describe('parseCodeBlocks', () => {
  test('separa texto e código com a linguagem', () => {
    expect(parseCodeBlocks('antes\n```ts\nconst a = 1\n```\ndepois')).toEqual([
      { tipo: 'texto', conteudo: 'antes\n' },
      { tipo: 'codigo', conteudo: 'const a = 1', linguagem: 'ts' },
      { tipo: 'texto', conteudo: '\ndepois' },
    ])
  })

  test('bloco sem linguagem', () => {
    expect(parseCodeBlocks('```\nx\n```')).toEqual([{ tipo: 'codigo', conteudo: 'x', linguagem: undefined }])
  })

  test('crases no meio da linha fazem parte do código', () => {
    const [bloco] = parseCodeBlocks("```js\ntexto.split('```')\n```")
    expect(bloco).toEqual({ tipo: 'codigo', conteudo: "texto.split('```')", linguagem: 'js' })
  })

  test('cerca maior permite crases triplas dentro', () => {
    const [bloco] = parseCodeBlocks('````md\n```js\nx\n```\n````')
    expect(bloco?.conteudo).toBe('```js\nx\n```')
  })

  test('bloco interno com linguagem não fecha o de fora', () => {
    const segs = parseCodeBlocks('```md\n# Título\n```js\nx\n```\nfim\n```')
    expect(segs).toHaveLength(1)
    expect(segs[0]?.conteudo).toBe('# Título\n```js\nx\n```\nfim')
  })

  test('aceita as crases de fechamento coladas no fim da mensagem', () => {
    const [bloco] = parseCodeBlocks('```py\nprint(1)```')
    expect(bloco).toEqual({ tipo: 'codigo', conteudo: 'print(1)', linguagem: 'py' })
  })

  test('abertura sem fechamento continua texto', () => {
    expect(parseCodeBlocks('```js\nsem fim')).toEqual([{ tipo: 'texto', conteudo: '```js\nsem fim' }])
  })
})

describe('funções derivadas', () => {
  test('temCodigoFormatado', () => {
    expect(temCodigoFormatado('```\nx\n```')).toBe(true)
    expect(temCodigoFormatado('só texto com `crase`')).toBe(false)
  })

  test('removerBlocosCodigo deixa só o texto', () => {
    expect(removerBlocosCodigo('a\n```\nx\n```\nb')).toBe('a\n\nb')
  })

  test('resumirCodigo troca o bloco por "Código (linguagem)" numa linha', () => {
    expect(resumirCodigo('veja\n```sql\nselect 1\n```\nok')).toBe('veja Código (sql) ok')
  })
})

describe('cercaCodigo', () => {
  test('no mínimo três crases', () => {
    expect(cercaCodigo('sem crases')).toBe('```')
  })

  test('uma crase a mais que a maior sequência de dentro', () => {
    expect(cercaCodigo('tem ```` quatro')).toBe('`````')
  })
})

describe('pareceCodigo', () => {
  test('código colado', () => {
    expect(pareceCodigo('function soma(a, b) {\n  return a + b;\n}')).toBe(true)
  })

  test('comandos de terminal', () => {
    expect(pareceCodigo('cd projeto\nnpm install')).toBe(true)
  })

  test('texto comum em várias linhas', () => {
    expect(pareceCodigo('Oi, tudo bem?\nAmanhã a gente conversa.')).toBe(false)
  })

  test('uma linha só nunca é código', () => {
    expect(pareceCodigo('const a = 1;')).toBe(false)
  })

  test('já formatado com crases não é tratado de novo', () => {
    expect(pareceCodigo('```\nconst a = 1;\n```')).toBe(false)
  })

  test('desenho de árvore', () => {
    expect(pareceCodigo('src\n├── main.ts\n└── App.vue')).toBe(true)
    expect(ehDesenhoAscii('└── App.vue')).toBe(true)
  })
})
