import { describe, expect, test } from 'bun:test'
import { ordenarMensagens, primeiraMensagemSalva, ultimaMensagemSalva } from '@/utils/ordemMensagens'
import { mensagem } from './fabrica'

const as = (hora: string) => new Date(`2026-09-01T${hora}:00Z`)
const ids = (lista: { id: number }[]) => lista.map((m) => m.id)

describe('ordenarMensagens', () => {
  test('ordena pelo momento em que ficou visível', () => {
    const lista = [
      mensagem({ id: 1, inserida: as('10:00') }),
      mensagem({ id: 2, inserida: as('09:00') }),
    ]
    expect(ids(ordenarMensagens(lista))).toEqual([2, 1])
  })

  test('agendada entra no horário em que ficou visível, não no id', () => {
    const lista = [
      mensagem({ id: 1, inserida: as('09:00'), visivel_em: as('11:00') }),
      mensagem({ id: 2, inserida: as('10:00') }),
    ]
    expect(ids(ordenarMensagens(lista))).toEqual([2, 1])
  })

  test('empate de horário desempata pelo id', () => {
    const lista = [mensagem({ id: 5, inserida: as('10:00') }), mensagem({ id: 3, inserida: as('10:00') })]
    expect(ids(ordenarMensagens(lista))).toEqual([3, 5])
  })

  test('mensagens ainda sendo enviadas (id negativo) ficam no fim', () => {
    const lista = [
      mensagem({ id: -1, inserida: as('08:00') }),
      mensagem({ id: 2, inserida: as('10:00') }),
    ]
    expect(ids(ordenarMensagens(lista))).toEqual([2, -1])
  })

  test('não altera a lista original', () => {
    const lista = [mensagem({ id: 2, inserida: as('10:00') }), mensagem({ id: 1, inserida: as('09:00') })]
    ordenarMensagens(lista)
    expect(ids(lista)).toEqual([2, 1])
  })
})

describe('primeira e última mensagem salva', () => {
  const lista = [mensagem({ id: -3 }), mensagem({ id: 4 }), mensagem({ id: 7 }), mensagem({ id: -1 })]

  test('ignora as de id provisório', () => {
    expect(primeiraMensagemSalva(lista)?.id).toBe(4)
    expect(ultimaMensagemSalva(lista)?.id).toBe(7)
  })

  test('sem nenhuma salva devolve undefined', () => {
    expect(primeiraMensagemSalva([mensagem({ id: -1 })])).toBeUndefined()
  })
})
