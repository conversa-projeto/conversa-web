import { describe, expect, test } from 'bun:test'
import { TipoConteudo } from '@/types/api'
import {
  extensaoPorMime,
  formatarDuracao,
  formatarTamanho,
  formatarUrl,
  inicialNome,
  iniciaisUsuario,
  isMensagemSoEmoji,
  isVideoConteudo,
  normalizarExtensaoArquivo,
  parseLinks,
  parseTextSegments,
  resumirTexto,
  resumoMensagem,
  statusEntrega,
} from '@/utils/formatters'
import { conteudo, mensagem, texto } from './fabrica'

describe('parseLinks', () => {
  test('separa texto e link', () => {
    expect(parseLinks('veja https://a.com agora')).toEqual([
      { tipo: 'texto', conteudo: 'veja ' },
      { tipo: 'link', conteudo: 'https://a.com' },
      { tipo: 'texto', conteudo: ' agora' },
    ])
  })

  test('pontuação no fim fica fora do link', () => {
    expect(parseLinks('abra https://a.com/x.')[1]).toEqual({ tipo: 'link', conteudo: 'https://a.com/x' })
  })

  test('parêntese do próprio link fica, o de fora sai', () => {
    expect(parseLinks('https://pt.wikipedia.org/wiki/Java_(linguagem)')[0]?.conteudo).toBe('https://pt.wikipedia.org/wiki/Java_(linguagem)')
    expect(parseLinks('(ver https://a.com)')[1]?.conteudo).toBe('https://a.com')
  })

  test('link começando com www', () => {
    expect(parseLinks('www.a.com')).toEqual([{ tipo: 'link', conteudo: 'www.a.com' }])
  })

  test('chamadas seguidas não herdam estado da regex global', () => {
    parseLinks('https://a.com https://b.com')
    expect(parseLinks('https://c.com')).toEqual([{ tipo: 'link', conteudo: 'https://c.com' }])
  })
})

describe('menções', () => {
  test('parseTextSegments separa menção, link e texto', () => {
    expect(parseTextSegments('oi @[Ana](7) veja https://a.com')).toEqual([
      { tipo: 'texto', conteudo: 'oi ' },
      { tipo: 'mencao', conteudo: 'Ana', usuarioId: 7 },
      { tipo: 'texto', conteudo: ' veja ' },
      { tipo: 'link', conteudo: 'https://a.com' },
    ])
  })

  test('resumirTexto troca menção por @Nome', () => {
    expect(resumirTexto('oi @[Ana](7)')).toBe('oi @Ana')
  })
})

describe('resumoMensagem', () => {
  test('texto primeiro, depois o tipo do anexo', () => {
    expect(resumoMensagem(mensagem({ conteudos: [texto('olá')] }))).toBe('olá')
    expect(resumoMensagem(mensagem({ conteudos: [conteudo(TipoConteudo.Imagem)] }))).toBe('Imagem')
    expect(resumoMensagem(mensagem({ conteudos: [conteudo(TipoConteudo.Audio)] }))).toBe('Áudio')
    expect(resumoMensagem(mensagem({ conteudos: [conteudo(TipoConteudo.Arquivo)] }))).toBe('Arquivo')
  })
})

describe('nomes e iniciais', () => {
  test('inicialNome em maiúscula, com padrão para vazio', () => {
    expect(inicialNome('ana')).toBe('A')
    expect(inicialNome('  ', 'C')).toBe('C')
  })

  test('inicialNome não corta emoji ao meio', () => {
    expect(inicialNome('🦜 Arara')).toBe('🦜')
  })

  test('iniciaisUsuario pega até duas palavras', () => {
    expect(iniciaisUsuario('ana maria souza')).toBe('AM')
    expect(iniciaisUsuario('')).toBe('')
  })
})

describe('arquivos', () => {
  test('normalizarExtensaoArquivo usa a extensão ou o nome', () => {
    expect(normalizarExtensaoArquivo(conteudo(TipoConteudo.Arquivo, '', { extensao: '.PDF' }))).toBe('pdf')
    expect(normalizarExtensaoArquivo(conteudo(TipoConteudo.Arquivo, '', { nome: 'Relatorio.Final.HTML' }))).toBe('html')
  })

  test('isVideoConteudo pela extensão', () => {
    expect(isVideoConteudo(conteudo(TipoConteudo.Arquivo, '', { nome: 'aula.mp4' }))).toBe(true)
    expect(isVideoConteudo(conteudo(TipoConteudo.Arquivo, '', { nome: 'aula.pdf' }))).toBe(false)
  })

  test('extensaoPorMime, com png como padrão', () => {
    expect(extensaoPorMime('image/jpeg')).toBe('jpg')
    expect(extensaoPorMime('image/webp')).toBe('webp')
    expect(extensaoPorMime('application/octet-stream')).toBe('png')
  })

  test('formatarTamanho', () => {
    expect(formatarTamanho(512)).toBe('512 B')
    expect(formatarTamanho(1536)).toBe('1.5 KB')
    expect(formatarTamanho(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatarTamanho(2 * 1024 ** 3)).toBe('2.0 GB')
  })
})

describe('outros formatos', () => {
  test('formatarDuracao', () => {
    expect(formatarDuracao(65.9)).toBe('01:05')
    expect(formatarDuracao(null)).toBe('--:--')
    expect(formatarDuracao(-3)).toBe('00:00')
  })

  test('formatarUrl completa o protocolo', () => {
    expect(formatarUrl('www.a.com')).toBe('https://www.a.com')
    expect(formatarUrl('http://a.com')).toBe('http://a.com')
  })

  test('isMensagemSoEmoji', () => {
    expect(isMensagemSoEmoji('👍🏽 ❤️')).toBe(true)
    expect(isMensagemSoEmoji('ok 👍')).toBe(false)
    expect(isMensagemSoEmoji('   ')).toBe(false)
  })

  test('statusEntrega', () => {
    expect(statusEntrega(mensagem({ id: -1 }))).toBe('')
    expect(statusEntrega(mensagem())).toBe('✓')
    expect(statusEntrega(mensagem({ recebida: true }))).toBe('✓✓')
    expect(statusEntrega(mensagem({ visualizada: true }))).toBe('✓✓')
  })
})
