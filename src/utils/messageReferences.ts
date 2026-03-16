import { TipoConteudo, TipoMensagemReferencia } from '../types/api'
import type { ConteudoMensagem, Mensagem } from '../types/api'

export interface MensagemReferenciaResumo {
  tipo: number
  id: number
  remetente: string
  conteudo_resumo: string
  conversa_id?: number
}

function resumoConteudos(conteudos: ConteudoMensagem[]): string {
  const texto = conteudos.find((c) => Number(c.tipo) === TipoConteudo.Texto)?.conteudo
  if (texto) return texto
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Imagem)) return 'Imagem'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.GravacaoAudio)) return 'Gravacao de audio'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Audio)) return 'Audio'
  return 'Arquivo'
}

export function obterReferenciaPrincipal(mensagem: Mensagem): MensagemReferenciaResumo | null {
  const referencia = mensagem.mensagem_referencia

  if (referencia?.mensagem) {
    return {
      tipo: Number(referencia.tipo),
      id: referencia.mensagem.id,
      remetente: referencia.mensagem.remetente || 'Mensagem referenciada',
      conteudo_resumo: resumoConteudos(referencia.mensagem.conteudos || []),
      conversa_id: referencia.mensagem.conversa_id
    }
  }

  return null
}

export function tituloReferencia(tipo: number, remetente: string): string {
  if (Number(tipo) === TipoMensagemReferencia.Encaminhada) {
    return remetente === 'Mensagem referenciada' ? 'Encaminhado' : `Encaminhado de ${remetente}`
  }
  return remetente
}
