import type { Mensagem, TipoMensagemReferencia } from '../types/api'

// Rascunho do campo de mensagem, um por usuário e conversa, no IndexedDB do
// navegador: guarda os arquivos (Blob) e sobrevive a fechar o navegador.

export interface AnexoRascunho {
  /** Chave da peça no HTML (data-anexo) */
  id: string
  blob: Blob
  nomeArquivo: string
  mimeType: string
  isAudio?: boolean
  isGravacaoAudio?: boolean
}

export interface Rascunho {
  /** O campo como estava: texto, linhas, menções e figurinhas */
  html: string
  anexos: AnexoRascunho[]
  /** "Respondendo a..." (ou encaminhando) em andamento */
  respondendo: Mensagem | null
  tipoReferencia: TipoMensagemReferencia
  atualizadoEm: number
}

const BANCO = 'conversa-rascunhos'
const LOJA = 'rascunhos'

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

export function chaveRascunho(usuarioId: number, conversaId: number) {
  return `${usuarioId}:${conversaId}`
}

export async function lerRascunho(chave: string): Promise<Rascunho | null> {
  return (await naLoja<Rascunho | undefined>('readonly', (loja) => loja.get(chave))) ?? null
}

export async function salvarRascunho(chave: string, rascunho: Rascunho) {
  await naLoja('readwrite', (loja) => loja.put(rascunho, chave))
}

export async function apagarRascunho(chave: string) {
  await naLoja('readwrite', (loja) => loja.delete(chave))
}
