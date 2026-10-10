import type { ResumoConversa } from '../types/api'

// Último resumo de cada conversa, por usuário, no IndexedDB do navegador: fecha
// a janela do resumo (ou o navegador) e ele continua lá. Um resumo ainda em
// andamento também fica, para a janela voltar a acompanhá-lo no servidor.

export interface ResumoSalvo {
  resumo: ResumoConversa
  /** Quando foi pedido */
  geradoEm: number
}

const BANCO = 'conversa-resumos'
const LOJA = 'resumos'

let abrindo: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  abrindo ??= new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => {
      abrindo = null
      rejeitar(pedido.error)
    }
  })
  return abrindo
}

async function naLoja<T>(modo: IDBTransactionMode, acao: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const banco = await abrir()
  return new Promise((resolver, rejeitar) => {
    const transacao = banco.transaction(LOJA, modo)
    const pedido = acao(transacao.objectStore(LOJA))
    transacao.oncomplete = () => resolver(pedido.result)
    transacao.onerror = () => rejeitar(transacao.error)
    transacao.onabort = () => rejeitar(transacao.error)
  })
}

export function chaveResumo(usuarioId: number, conversaId: number) {
  return `${usuarioId}:${conversaId}`
}

export async function lerResumoSalvo(chave: string): Promise<ResumoSalvo | null> {
  return (await naLoja<ResumoSalvo | undefined>('readonly', (loja) => loja.get(chave))) ?? null
}

export async function salvarResumo(chave: string, salvo: ResumoSalvo) {
  await naLoja('readwrite', (loja) => loja.put(salvo, chave))
}
