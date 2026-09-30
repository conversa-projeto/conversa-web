// API falsa no lugar do fetch: as stores chamam o conversaApi, que passa pelo
// cliente Eden e chega aqui. Cada teste diz o que cada rota responde e confere
// o que foi pedido.
import { afterEach } from 'bun:test'

export interface Pedido {
  metodo: string
  caminho: string
  consulta: Record<string, string>
  corpo: any
  cabecalhos: Headers
}

type Resposta = unknown | Response | ((pedido: Pedido) => unknown | Response | Promise<unknown>)

const fetchOriginal = globalThis.fetch
let rotas = new Map<string, Resposta>()
export const pedidos: Pedido[] = []

// Resposta de uma rota: valor (vira JSON), Response pronta ou função do pedido.
export function rota(metodo: string, caminho: string, resposta: Resposta) {
  rotas.set(`${metodo.toUpperCase()} ${caminho}`, resposta)
}

export function pedidosDe(metodo: string, caminho: string) {
  return pedidos.filter((p) => p.metodo === metodo.toUpperCase() && p.caminho === caminho)
}

export function erro(status: number, mensagem: string) {
  return new Response(JSON.stringify({ error: mensagem }), { status, headers: { 'content-type': 'application/json' } })
}

globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const requisicao = new Request(entrada, init)
  const url = new URL(requisicao.url)
  const texto = requisicao.method === 'GET' ? '' : await requisicao.text()
  const pedido: Pedido = {
    metodo: requisicao.method,
    caminho: url.pathname.replace(/^\/api/, ''),
    consulta: Object.fromEntries(url.searchParams),
    corpo: texto ? JSON.parse(texto) : undefined,
    cabecalhos: requisicao.headers,
  }
  pedidos.push(pedido)
  const definida = rotas.get(`${pedido.metodo} ${pedido.caminho}`)
  if (definida === undefined) return erro(404, `rota falsa não definida: ${pedido.metodo} ${pedido.caminho}`)
  const valor = typeof definida === 'function' ? await (definida as (p: Pedido) => unknown)(pedido) : definida
  // Cópia: a mesma resposta pode ser pedida mais de uma vez
  return valor instanceof Response ? valor.clone() : Response.json(valor)
}) as typeof fetch

afterEach(() => {
  rotas = new Map()
  pedidos.length = 0
})

export function restaurarFetch() {
  globalThis.fetch = fetchOriginal
}

// --- WebSocket falso: o teste abre a conexão e manda eventos como o servidor ---

export class SocketFalso {
  static instancias: SocketFalso[] = []
  static readonly OPEN = 1
  static readonly CLOSED = 3
  readyState = 0
  enviados: any[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((evento: { data: string }) => void) | null = null

  constructor(public url: string) {
    SocketFalso.instancias.push(this)
  }

  send(dados: string) {
    this.enviados.push(JSON.parse(dados))
  }

  close() {
    this.readyState = SocketFalso.CLOSED
  }

  abrir() {
    this.readyState = SocketFalso.OPEN
    this.onopen?.()
  }

  receber(evento: object) {
    this.onmessage?.({ data: JSON.stringify(evento) })
  }

  cair() {
    this.readyState = SocketFalso.CLOSED
    this.onclose?.()
  }

  static ultimo() {
    return SocketFalso.instancias.at(-1)!
  }
}

globalThis.WebSocket = SocketFalso as unknown as typeof WebSocket
afterEach(() => {
  SocketFalso.instancias.length = 0
})

// Espera as promessas pendentes (chamadas à API falsa) terminarem
export async function aguardar(vezes = 5) {
  for (let i = 0; i < vezes; i++) await new Promise((resolver) => setTimeout(resolver, 0))
}
