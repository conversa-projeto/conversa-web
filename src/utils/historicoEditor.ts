// Desfazer/refazer do campo de mensagem. O Ctrl+Z do navegador só conhece o
// que ele mesmo mudou: peça inserida ou tirada pelo app (imagem, figurinha,
// menção) ficaria de fora. Aqui cada mudança guarda o campo como estava antes
// (o HTML e o cursor), e desfazer volta a ele.

interface Estado {
  html: string
  cursor: { caminho: number[]; posicao: number } | null
}

// digitar e apagar seguidos viram um passo só, como no navegador
export type TipoMudanca = 'digitar' | 'apagar' | 'outro'

const AGRUPAR_MS = 1000
const LIMITE = 100

function caminhoAte(raiz: Node, no: Node): number[] | null {
  const caminho: number[] = []
  let atual: Node | null = no
  while (atual && atual !== raiz) {
    const pai: Node | null = atual.parentNode
    if (!pai) return null
    caminho.unshift([...pai.childNodes].indexOf(atual as ChildNode))
    atual = pai
  }
  return atual === raiz ? caminho : null
}

function capturar(raiz: HTMLElement): Estado {
  const selecao = window.getSelection()
  const intervalo = selecao?.rangeCount ? selecao.getRangeAt(0) : null
  const caminho = intervalo ? caminhoAte(raiz, intervalo.startContainer) : null
  return {
    html: raiz.innerHTML,
    cursor: caminho && intervalo ? { caminho, posicao: intervalo.startOffset } : null,
  }
}

function restaurar(raiz: HTMLElement, estado: Estado) {
  raiz.innerHTML = estado.html
  let no: Node | null = raiz
  for (const indice of estado.cursor?.caminho ?? []) no = no?.childNodes[indice] ?? null
  const intervalo = document.createRange()
  if (no && estado.cursor) {
    const tamanho = no.nodeType === Node.TEXT_NODE ? (no.textContent ?? '').length : no.childNodes.length
    intervalo.setStart(no, Math.min(estado.cursor.posicao, tamanho))
  } else {
    intervalo.selectNodeContents(raiz)
    intervalo.collapse(false)
  }
  intervalo.collapse(true)
  const selecao = window.getSelection()
  selecao?.removeAllRanges()
  selecao?.addRange(intervalo)
}

export function criarHistorico(obterRaiz: () => HTMLElement | null, aoRestaurar: (raiz: HTMLElement) => void) {
  let passados: Estado[] = []
  let futuros: Estado[] = []
  let ultimoTipo: TipoMudanca | null = null
  let ultimoEm = 0
  let emPasso = false

  // Chamar ANTES de mudar o campo
  function registrar(tipo: TipoMudanca) {
    const raiz = obterRaiz()
    if (!raiz || emPasso) return
    const agora = Date.now()
    const continua = tipo !== 'outro' && tipo === ultimoTipo && agora - ultimoEm < AGRUPAR_MS
    ultimoTipo = tipo
    ultimoEm = agora
    if (continua) return
    passados.push(capturar(raiz))
    if (passados.length > LIMITE) passados.shift()
    futuros = []
  }

  function trocar(de: Estado[], para: Estado[]) {
    const raiz = obterRaiz()
    const estado = de.pop()
    if (!raiz || !estado) return false
    para.push(capturar(raiz))
    restaurar(raiz, estado)
    ultimoTipo = null
    aoRestaurar(raiz)
    return true
  }

  // Várias mudanças que são uma ação só (ex.: colar texto com menções, colar
  // vários arquivos): um passo só do desfazer
  function emUmPasso(acao: () => void) {
    registrar('outro')
    emPasso = true
    try {
      acao()
    } finally {
      emPasso = false
    }
  }

  return {
    registrar,
    emUmPasso,
    desfazer: () => trocar(passados, futuros),
    refazer: () => trocar(futuros, passados),
    limpar() {
      passados = []
      futuros = []
      ultimoTipo = null
    },
  }
}
