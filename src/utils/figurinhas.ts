// Figurinhas animadas (Lottie). As animações ficam em public/figurinhas,
// baixadas por scripts/baixar-figurinhas-noto.ts; a mensagem leva só o
// identificador pacote/nome.
import { PACOTE_NOTO } from './figurinhasNoto'

export interface Figurinha {
  id: string
  nome: string
}

export interface PacoteFigurinhas {
  id: string
  nome: string
  /** Pacote de terceiros: o crédito que a licença pede, mostrado no seletor */
  credito?: { texto: string; link: string }
  figurinhas: Figurinha[]
}

// Emojis animados do Google, baixados por scripts/baixar-figurinhas-noto.ts
export const PACOTES_FIGURINHAS: PacoteFigurinhas[] = [PACOTE_NOTO]

export function urlFigurinha(id: string) {
  return `/figurinhas/${id}.json`
}

export function nomeFigurinha(id: string) {
  for (const pacote of PACOTES_FIGURINHAS) {
    const figurinha = pacote.figurinhas.find((f) => f.id === id)
    if (figurinha) return figurinha.nome
  }
  return 'Figurinha'
}

// O player (versão só SVG, a mais leve) e cada animação são baixados uma vez,
// na primeira figurinha que aparece
let player: Promise<typeof import('lottie-web/build/player/lottie_light')['default']> | null = null
const animacoes = new Map<string, Promise<object>>()

export function carregarPlayerLottie() {
  player ??= import('lottie-web/build/player/lottie_light').then((m) => m.default)
  return player
}

export function carregarAnimacaoFigurinha(id: string) {
  let dados = animacoes.get(id)
  if (!dados) {
    dados = fetch(urlFigurinha(id)).then((resposta) => {
      if (!resposta.ok) throw new Error(`Figurinha ${id} não encontrada`)
      return resposta.json() as Promise<object>
    })
    // Falhou: a próxima tentativa baixa de novo
    dados.catch(() => animacoes.delete(id))
    animacoes.set(id, dados)
  }
  return dados
}
