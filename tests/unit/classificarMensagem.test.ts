import { describe, expect, test } from 'bun:test'
import { TipoConteudo } from '@/types/api'
import { classificarMensagem, TipoExibicaoMensagem } from '@/utils/classificarMensagem'
import { comReferencia, conteudo, mensagem, texto } from './fabrica'

describe('classificarMensagem', () => {
  test('excluída vem antes de qualquer outro tipo', () => {
    for (const conteudos of [[conteudo(TipoConteudo.Chamada)], [conteudo(TipoConteudo.Imagem)], [texto('```ts\nx\n```')], [texto('oi')]]) {
      expect(classificarMensagem(mensagem({ conteudos, excluida_em: new Date() }))).toBe(TipoExibicaoMensagem.Excluida)
    }
    expect(classificarMensagem(mensagem({ conteudos: [texto('oi')], excluida_em: null }))).toBe(TipoExibicaoMensagem.TextoCurto)
  })

  test('chamada', () => {
    expect(classificarMensagem(mensagem({ conteudos: [conteudo(TipoConteudo.Chamada)] }))).toBe(TipoExibicaoMensagem.Chamada)
  })

  test('uma imagem sem referência', () => {
    expect(classificarMensagem(mensagem({ conteudos: [conteudo(TipoConteudo.Imagem)] }))).toBe(TipoExibicaoMensagem.Imagem)
  })

  test('imagem com referência não é bolha de imagem', () => {
    const m = mensagem({ conteudos: [conteudo(TipoConteudo.Imagem)], ...comReferencia([texto('oi')]) })
    expect(classificarMensagem(m)).toBe(TipoExibicaoMensagem.ComReferencia)
  })

  test('só um bloco de código', () => {
    const m = mensagem({ conteudos: [texto('```js\nconst a = 1\n```')] })
    expect(classificarMensagem(m)).toBe(TipoExibicaoMensagem.Codigo)
  })

  test('código com texto em volta não é bolha de código', () => {
    const m = mensagem({ conteudos: [texto('veja:\n```js\nconst a = 1\n```')] })
    expect(classificarMensagem(m)).toBe(TipoExibicaoMensagem.Padrao)
  })

  test('só emojis', () => {
    expect(classificarMensagem(mensagem({ conteudos: [texto('😀 👍')] }))).toBe(TipoExibicaoMensagem.Emoji)
  })

  test('resposta a outra mensagem', () => {
    const m = mensagem({ conteudos: [texto('concordo')], ...comReferencia([texto('vamos?')]) })
    expect(classificarMensagem(m)).toBe(TipoExibicaoMensagem.ComReferencia)
  })

  test('texto curto de uma linha, no limite de 60 caracteres', () => {
    expect(classificarMensagem(mensagem({ conteudos: [texto('a'.repeat(60))] }))).toBe(TipoExibicaoMensagem.TextoCurto)
  })

  test('texto com 61 caracteres é padrão', () => {
    expect(classificarMensagem(mensagem({ conteudos: [texto('a'.repeat(61))] }))).toBe(TipoExibicaoMensagem.Padrao)
  })

  test('texto com quebra de linha é padrão', () => {
    expect(classificarMensagem(mensagem({ conteudos: [texto('oi\ntudo bem?')] }))).toBe(TipoExibicaoMensagem.Padrao)
  })

  test('imagem com texto é padrão', () => {
    const m = mensagem({ conteudos: [conteudo(TipoConteudo.Imagem), texto('legenda')] })
    expect(classificarMensagem(m)).toBe(TipoExibicaoMensagem.Padrao)
  })
})
