import { TipoConteudo, type Mensagem } from '../types/api'
import { temCodigoFormatado } from '../composables/useCodeHighlight'
import { obterReferenciaPrincipal } from './messageReferences'
import { isMensagemSoEmoji } from './formatters'

export const TipoExibicaoMensagem = {
  Imagem: 'imagem',
  Codigo: 'codigo',
  ComReferencia: 'com-referencia',
  Emoji: 'emoji',
  TextoCurto: 'texto-curto',
  Padrao: 'padrao',
} as const
export type TipoExibicaoMensagem = (typeof TipoExibicaoMensagem)[keyof typeof TipoExibicaoMensagem]

export function classificarMensagem(mensagem: Mensagem): TipoExibicaoMensagem {
  const conteudos = mensagem.conteudos
  const temReferencia = !!mensagem.mensagem_referencia
  const conteudoUnico = conteudos.length === 1 ? conteudos[0] : null

  if (conteudoUnico && Number(conteudoUnico.tipo) === TipoConteudo.Imagem && !temReferencia) {
    return TipoExibicaoMensagem.Imagem
  }

  if (conteudoUnico && Number(conteudoUnico.tipo) === TipoConteudo.Texto && !temReferencia) {
    if (temCodigoFormatado(conteudoUnico.conteudo)) {
      const semCodigo = conteudoUnico.conteudo.replace(/```\w*\n[\s\S]*?```/g, '').trim()
      if (semCodigo.length === 0) {
        return TipoExibicaoMensagem.Codigo
      }
    }
  }

  if (conteudoUnico && Number(conteudoUnico.tipo) === TipoConteudo.Texto && !temReferencia) {
    if (isMensagemSoEmoji(conteudoUnico.conteudo)) {
      return TipoExibicaoMensagem.Emoji
    }
  }

  if (obterReferenciaPrincipal(mensagem)) {
    return TipoExibicaoMensagem.ComReferencia
  }

  if (conteudoUnico && Number(conteudoUnico.tipo) === TipoConteudo.Texto && !temReferencia) {
    if (!conteudoUnico.conteudo.includes('\n') && conteudoUnico.conteudo.length <= 60) {
      return TipoExibicaoMensagem.TextoCurto
    }
  }

  return TipoExibicaoMensagem.Padrao
}
