// Pastas de mensagens: cores para escolher e o arraste das mensagens
// selecionadas no chat até uma pasta do painel.

export const CORES_PASTA = ['', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'] as const

// Sem cor escolhida, a pasta usa a cor principal do tema
export function corDaPasta(cor: string) {
  return cor || 'var(--color-primary-500)'
}

// Tipo próprio no arraste: o chat não confunde com arquivo vindo de fora
export const TIPO_ARRASTE_MENSAGENS = 'application/x-conversa-mensagens'

export function iniciarArrasteMensagens(evento: DragEvent, ids: number[]) {
  const transferencia = evento.dataTransfer
  if (!transferencia) return
  transferencia.setData(TIPO_ARRASTE_MENSAGENS, JSON.stringify(ids))
  transferencia.effectAllowed = 'copy'
  // Imagem do arraste: só quantas mensagens vão, no lugar da bolha inteira
  const etiqueta = document.createElement('div')
  etiqueta.textContent = ids.length === 1 ? '1 mensagem' : `${ids.length} mensagens`
  etiqueta.style.cssText = 'position:fixed;top:-100px;left:-100px;padding:4px 10px;border-radius:9999px;background:var(--color-primary-600);color:#fff;font:600 12px sans-serif'
  document.body.appendChild(etiqueta)
  transferencia.setDragImage(etiqueta, 10, 10)
  setTimeout(() => etiqueta.remove())
}

export function ehArrasteDeMensagens(evento: DragEvent) {
  return !!evento.dataTransfer?.types.includes(TIPO_ARRASTE_MENSAGENS)
}

export function mensagensDoArraste(evento: DragEvent): number[] {
  try {
    const ids: unknown = JSON.parse(evento.dataTransfer?.getData(TIPO_ARRASTE_MENSAGENS) || '[]')
    return Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

// Clique direito na linha selecionada: fora da bolha, abre o mesmo menu da
// mensagem, como se o clique fosse na bolha. Mensagem sem menu (chamada,
// oculta) abre o da selecionada mais próxima que tenha
export function repassarCliqueDireito(evento: MouseEvent, selecionadas: ReadonlySet<number>) {
  const linha = evento.currentTarget as HTMLElement
  const alvo = evento.target as Element | null
  if (!alvo) return
  if (alvo.closest('[data-area-mensagem][data-tem-menu]')) return
  const linhas = Array.from(linha.parentElement?.querySelectorAll<HTMLElement>('[data-selecao-id]') ?? [])
  const posicao = linhas.indexOf(linha)
  const comMenu = linhas
    .map((outra, indice) => ({ outra, distancia: Math.abs(indice - posicao) }))
    .filter(({ outra }) => selecionadas.has(Number(outra.dataset.selecaoId)) && outra.querySelector('[data-area-mensagem][data-tem-menu]'))
    .sort((a, b) => a.distancia - b.distancia)[0]
  if (!comMenu) return
  evento.preventDefault()
  comMenu.outra.querySelector('[data-area-mensagem]')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: false, cancelable: true, clientX: evento.clientX, clientY: evento.clientY, ctrlKey: evento.ctrlKey, metaKey: evento.metaKey }))
}
