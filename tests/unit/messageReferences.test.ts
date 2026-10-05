import { describe, expect, test } from 'bun:test'
import { TipoConteudo, TipoMensagemReferencia } from '@/types/api'
import { obterConteudosReferencia, obterReferenciaPrincipal, tituloReferencia } from '@/utils/messageReferences'
import { comReferencia, conteudo, mensagem, texto } from './fabrica'

describe('obterReferenciaPrincipal', () => {
  test('citada excluída: o resumo diz "Mensagem oculta", sem o texto', () => {
    const m = mensagem({ mensagem_referencia: { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: 9, remetente: 'Bruno', excluida_em: new Date(), conteudos: [conteudo(TipoConteudo.Texto, 'segredo')] } } })
    expect(obterReferenciaPrincipal(m)).toMatchObject({ conteudo_resumo: 'Mensagem oculta', excluida_em: expect.any(Date) })
  })

  test('sem referência devolve null', () => {
    expect(obterReferenciaPrincipal(mensagem())).toBeNull()
  })

  test('resume o texto da mensagem referenciada', () => {
    const ref = obterReferenciaPrincipal(mensagem(comReferencia([texto('pergunta original')])))
    expect(ref).toMatchObject({ id: 99, remetente: 'Bruno', tipo: TipoMensagemReferencia.Resposta, conteudo_resumo: 'pergunta original' })
  })

  test.each([
    [TipoConteudo.Imagem, 'Imagem'],
    [TipoConteudo.GravacaoAudio, 'Gravacao de audio'],
    [TipoConteudo.Audio, 'Audio'],
    [TipoConteudo.Arquivo, 'Arquivo'],
  ])('sem texto, resume pelo tipo do anexo (%p → %p)', (tipo, esperado) => {
    const ref = obterReferenciaPrincipal(mensagem(comReferencia([conteudo(tipo)])))
    expect(ref?.conteudo_resumo).toBe(esperado)
  })

  test('texto tem prioridade sobre o anexo', () => {
    const ref = obterReferenciaPrincipal(mensagem(comReferencia([conteudo(TipoConteudo.Imagem), texto('legenda')])))
    expect(ref?.conteudo_resumo).toBe('legenda')
  })
})

describe('obterConteudosReferencia', () => {
  test('devolve os conteúdos da referenciada, ou lista vazia', () => {
    expect(obterConteudosReferencia(mensagem(comReferencia([texto('a')])))).toHaveLength(1)
    expect(obterConteudosReferencia(mensagem())).toEqual([])
  })
})

describe('tituloReferencia', () => {
  test('resposta mostra o remetente', () => {
    expect(tituloReferencia(TipoMensagemReferencia.Resposta, 'Bruno')).toBe('Bruno')
  })

  test('encaminhada mostra de quem veio', () => {
    expect(tituloReferencia(TipoMensagemReferencia.Encaminhada, 'Bruno')).toBe('Encaminhado de Bruno')
  })

  test('encaminhada sem remetente conhecido', () => {
    expect(tituloReferencia(TipoMensagemReferencia.Encaminhada, 'Resposta')).toBe('Encaminhado')
  })
})
