// Figurinhas animadas (Lottie). As animações ficam em public/figurinhas,
// geradas por scripts/gerar-figurinhas.ts; a mensagem leva só o identificador
// pacote/nome.
export interface Figurinha {
  id: string
  nome: string
}

export interface PacoteFigurinhas {
  id: string
  nome: string
  figurinhas: Figurinha[]
}

export const PACOTES_FIGURINHAS: PacoteFigurinhas[] = [
  {
    id: 'basico',
    nome: 'Básico',
    figurinhas: [
      { id: 'basico/coracao', nome: 'Coração' },
      { id: 'basico/sorriso', nome: 'Sorriso' },
      { id: 'basico/risada', nome: 'Risada' },
      { id: 'basico/estrela', nome: 'Estrela' },
      { id: 'basico/feito', nome: 'Feito' },
      { id: 'basico/festa', nome: 'Festa' },
      { id: 'basico/sono', nome: 'Sono' },
      { id: 'basico/pontinhos', nome: 'Pontinhos' },
    ],
  },
  {
    id: 'rostos',
    nome: 'Rostos',
    figurinhas: [
      { id: 'rostos/piscadinha', nome: 'Piscadinha' },
      { id: 'rostos/apaixonado', nome: 'Apaixonado' },
      { id: 'rostos/beijo', nome: 'Beijo' },
      { id: 'rostos/legal', nome: 'Legal' },
      { id: 'rostos/surpreso', nome: 'Surpreso' },
      { id: 'rostos/triste', nome: 'Triste' },
      { id: 'rostos/bravo', nome: 'Bravo' },
    ],
  },
  {
    id: 'coisas',
    nome: 'Coisas',
    figurinhas: [
      { id: 'coisas/joinha', nome: 'Joinha' },
      { id: 'coisas/fogo', nome: 'Fogo' },
      { id: 'coisas/coracao-partido', nome: 'Coração partido' },
      { id: 'coisas/presente', nome: 'Presente' },
      { id: 'coisas/bolo', nome: 'Bolo' },
      { id: 'coisas/balao', nome: 'Balão' },
      { id: 'coisas/cafe', nome: 'Café' },
      { id: 'coisas/sol', nome: 'Sol' },
      { id: 'coisas/chuva', nome: 'Chuva' },
    ],
  },
]

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
