import type { Mensagem } from '../types/api'

function momento(mensagem: Mensagem) {
  return Date.parse(mensagem.visivel_em || mensagem.inserida) || 0
}

// Mesma ordem da API: o momento em que a mensagem ficou visível (visivel_em das
// agendadas, senão inserida), com o id como desempate. Ordenar só pelo id põe
// uma agendada antes das mensagens mandadas enquanto ela esperava. As que ainda
// estão sendo enviadas (id provisório, negativo) ficam no fim.
export function ordenarMensagens(mensagens: Mensagem[]): Mensagem[] {
  return [...mensagens].sort((a, b) => {
    if ((a.id < 0) !== (b.id < 0)) return a.id < 0 ? 1 : -1
    return momento(a) - momento(b) || a.id - b.id
  })
}

// Referências da paginação: só mensagens já salvas, porque a API não conhece o
// id provisório de uma mensagem ainda sendo enviada.
export function primeiraMensagemSalva(mensagens: Mensagem[]) {
  return mensagens.find((mensagem) => mensagem.id > 0)
}

export function ultimaMensagemSalva(mensagens: Mensagem[]) {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].id > 0) return mensagens[i]
  }
  return undefined
}
