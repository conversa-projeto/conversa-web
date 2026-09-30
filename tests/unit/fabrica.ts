import { TipoConteudo, TipoMensagemReferencia, type ConteudoMensagem, type Mensagem } from '@/types/api'

// Monta mensagens para os testes: só os campos que importam mudam em cada caso.

export function conteudo(tipo: TipoConteudo, valor = '', extras: Partial<ConteudoMensagem> = {}): ConteudoMensagem {
  return { tipo, ordem: 1, conteudo: valor, ...extras }
}

export function texto(valor: string): ConteudoMensagem {
  return conteudo(TipoConteudo.Texto, valor)
}

export function mensagem(extras: Partial<Mensagem> = {}): Mensagem {
  return {
    id: 1,
    remetente_id: 1,
    remetente: 'Ana',
    conversa_id: 1,
    inserida: new Date('2026-09-01T12:00:00Z'),
    alterada: null,
    visivel_em: null,
    recebida: false,
    visualizada: false,
    reproduzida: false,
    conteudos: [],
    ...extras,
  }
}

export function comReferencia(conteudos: ConteudoMensagem[], tipo: number = TipoMensagemReferencia.Resposta): Partial<Mensagem> {
  return {
    mensagem_referencia: {
      tipo,
      mensagem: { id: 99, remetente: 'Bruno', conteudos },
    },
  }
}
