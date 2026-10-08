import { treaty } from '@elysiajs/eden'
import type { App } from '../../../conversa/src/app'
import { ErroNaoAutenticado, getApiBase, getToken, limparToken } from './http'

// Campos de data das respostas da API. Viram Date, como o tipo do Eden diz.
// A conversao fica restrita a eles: o Eden, por padrao, transforma qualquer
// texto com cara de data, e uma mensagem que fosse so "2026-10-05" viraria Date.
const CAMPOS_DATA = new Set([
  'inserida',
  'alterada',
  'visivel_em',
  'encerra_em',
  'encerrada_em',
  'criado_em',
  'atualizado_em',
  'ultima_mensagem',
  'arquivada_em',
  'iniciada',
  'finalizada',
  'adicionado_em',
  'entrou_em',
  'saiu_em',
  'recusou_em',
  'recebida',
  'visualizada',
  'reproduzida',
  'excluida_em',
  'reagido_em',
  'online_em',
  'ate',
  'vistas_em',
])

// ISO-8601 com fuso, como a API serializa as datas
const DATA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

function lerJson(texto: string): unknown {
  return JSON.parse(texto, (chave, valor: unknown) =>
    typeof valor === 'string' && CAMPOS_DATA.has(chave) && DATA_ISO.test(valor) ? new Date(valor) : valor)
}

function criarCliente(base: string) {
  return treaty<App>(base, {
    parseDate: false,
    headers: () => {
      const token = getToken()
      return token ? { authorization: `Bearer ${token}` } : undefined
    },
    // Resposta de sucesso em JSON: lida aqui, com as datas convertidas. Erros
    // seguem para o Eden, que monta o error com o corpo { error }.
    onResponse: async (resposta) => {
      if (!resposta.ok || !resposta.headers.get('content-type')?.includes('application/json')) {
        return undefined
      }
      return lerJson(await resposta.text())
    },
  })
}

let cliente: { base: string; api: ReturnType<typeof criarCliente> } | undefined

// Cliente tipado das rotas /api. O endereco pode mudar na tela de login
// (conversa.apiBase), entao o cliente e recriado quando ele muda.
export function api() {
  const base = getApiBase()
  if (cliente?.base !== base) {
    cliente = { base, api: criarCliente(base) }
  }
  return cliente.api.api
}

type RespostaEden<T> =
  | { data: T; error: null }
  | { data: null; error: { status: unknown; value: unknown } }

function mensagemDoErro(valor: unknown, status: unknown): string {
  // Página de erro do nginx (502/504 com a API fora do ar ou reiniciando)
  if (typeof valor === 'string' && valor.trimStart().startsWith('<')) {
    return 'Servidor indisponível'
  }
  if (typeof valor === 'object' && valor !== null) {
    const { error, message } = valor as { error?: unknown; message?: unknown }
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message
  }
  return typeof valor === 'string' && valor ? valor : `Erro HTTP ${String(status)}`
}

// Dados da resposta ou erro com a mensagem do servidor. 401 limpa o token e
// lanca ErroNaoAutenticado.
export async function dados<T>(chamada: Promise<RespostaEden<T>>): Promise<T> {
  const { data, error } = await chamada
  if (error) {
    const mensagem = mensagemDoErro(error.value, error.status)
    if (error.status === 401) {
      limparToken()
      throw new ErroNaoAutenticado(mensagem)
    }
    throw new Error(mensagem)
  }
  return data
}
