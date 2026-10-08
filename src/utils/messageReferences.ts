import { TipoConteudo, TipoMensagemReferencia } from '../types/api'
import type { ConteudoMensagem, Mensagem, MensagemReferencia } from '../types/api'

export interface MensagemReferenciaResumo {
  tipo: number
  id: number
  remetente: string
  inserida?: Date
  conteudo_resumo: string
  conversa_id?: number
  /** A citada foi excluída pelo autor: o resumo não mostra o conteúdo */
  excluida_em?: Date | null
  mensagem_referencia?: MensagemReferencia | null
}

function resumoConteudos(conteudos: ConteudoMensagem[]): string {
  const texto = conteudos.find((c) => Number(c.tipo) === TipoConteudo.Texto)?.conteudo
  if (texto) return texto
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Imagem)) return 'Imagem'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.GravacaoAudio)) return 'Gravacao de audio'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Audio)) return 'Audio'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Figurinha)) return 'Figurinha'
  if (conteudos.some((c) => Number(c.tipo) === TipoConteudo.Enquete)) return 'Votação'
  return 'Arquivo'
}

export function obterReferenciaPrincipal(mensagem: Mensagem): MensagemReferenciaResumo | null {
  const referencia = mensagem.mensagem_referencia

  if (referencia?.mensagem) {
    return {
      tipo: Number(referencia.tipo),
      id: referencia.mensagem.id,
      remetente: referencia.mensagem.remetente || 'Resposta',
      inserida: referencia.mensagem.inserida,
      conteudo_resumo: referencia.mensagem.excluida_em ? 'Mensagem oculta' : resumoConteudos(referencia.mensagem.conteudos || []),
      conversa_id: referencia.mensagem.conversa_id,
      excluida_em: referencia.mensagem.excluida_em,
      mensagem_referencia: referencia.mensagem.mensagem_referencia
    }
  }

  return null
}

export function obterConteudosReferencia(mensagem: Mensagem): ConteudoMensagem[] {
  return mensagem.mensagem_referencia?.mensagem?.conteudos || []
}

// Encaminhada leva uma cópia dos conteúdos da original, que já aparecem na
// citação logo abaixo: some com essas cópias (uma por uma, na mesma
// quantidade) e fica só o que foi acrescentado. Resposta não copia nada.
export function semCopiasDaReferencia(conteudos: ConteudoMensagem[], referencia: MensagemReferencia | null | undefined): ConteudoMensagem[] {
  if (Number(referencia?.tipo) !== TipoMensagemReferencia.Encaminhada || !referencia?.mensagem) return conteudos
  const jaExibidos = (referencia.mensagem.conteudos || []).map((c) => `${Number(c.tipo)}:${c.conteudo}`)
  return conteudos.filter((c) => {
    const indice = jaExibidos.indexOf(`${Number(c.tipo)}:${c.conteudo}`)
    if (indice < 0) return true
    jaExibidos.splice(indice, 1)
    return false
  })
}

export function tituloReferencia(tipo: number, remetente: string): string {
  if (Number(tipo) === TipoMensagemReferencia.Encaminhada) {
    return remetente === 'Resposta' ? 'Encaminhado' : `Encaminhado de ${remetente}`
  }
  return remetente
}
