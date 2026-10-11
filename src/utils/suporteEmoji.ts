// O que o navegador consegue desenhar: emojis de uma versão do Unicode mais
// nova que a do sistema aparecem como quadrado (ou, se juntam outros com ZWJ,
// como dois emojis lado a lado). Testa um emoji representante de cada versão,
// uma vez só. (Bandeiras não entram no seletor.)

// Do mais novo ao mais antigo: o primeiro que aparece diz a versão suportada
const REPRESENTANTES: [number, string][] = [
  [16, '🫩'],
  [15.1, '🙂‍↔️'],
  [15, '🫨'],
  [14, '🫠'],
  [13.1, '😶‍🌫️'],
  [13, '🥲'],
  [12, '🥱'],
  [11, '🥰'],
]

const TAMANHO = 32

export interface SuporteEmoji {
  /** Versão do Unicode mais nova que aparece direito */
  versao: number
}

let suporte: SuporteEmoji | null = null

// Desenha e confere: largura de um emoji só e com cor (o quadrado é cinza)
function aparece(contexto: CanvasRenderingContext2D, emoji: string, larguraDeReferencia: number) {
  const largura = contexto.measureText(emoji).width
  if (largura > larguraDeReferencia * 1.5) return false
  contexto.clearRect(0, 0, TAMANHO * 2, TAMANHO * 2)
  contexto.fillText(emoji, 0, 0)
  const pixels = contexto.getImageData(0, 0, TAMANHO * 2, TAMANHO * 2).data
  for (let i = 0; i < pixels.length; i += 4) {
    const [vermelho, verde, azul, opacidade] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!]
    if (opacidade > 0 && Math.max(vermelho, verde, azul) - Math.min(vermelho, verde, azul) > 40) return true
  }
  return false
}

export function suporteEmoji(): SuporteEmoji {
  if (suporte) return suporte
  const contexto = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  // Sem canvas (testes): mostra tudo
  if (!contexto) return (suporte = { versao: Infinity })
  contexto.canvas.width = TAMANHO * 2
  contexto.canvas.height = TAMANHO * 2
  contexto.textBaseline = 'top'
  contexto.font = `${TAMANHO}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  const referencia = contexto.measureText('😀').width
  // Nenhum apareceu: o teste é que não funcionou aqui; melhor mostrar tudo que esconder tudo
  const versao = REPRESENTANTES.find(([, emoji]) => aparece(contexto, emoji, referencia))?.[0] ?? Infinity
  return (suporte = { versao })
}

export function emojiAparece(versao: number) {
  return versao <= suporteEmoji().versao
}
