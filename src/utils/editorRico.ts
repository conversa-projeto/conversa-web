import { carregarAnimacaoFigurinha, carregarPlayerLottie, nomeFigurinha } from './figurinhas'

// Peças do campo de mensagem rico. Imagem, vídeo, áudio, arquivo, figurinha e
// menção entram como um elemento que não se edita por dentro
// (contenteditable=false): o navegador o trata como um caractere, que o
// Backspace e o Delete apagam inteiro e o cursor atravessa. Menção fica no meio
// do texto; as outras ficam numa linha própria, como um bloco da mensagem.

// Espaço invisível depois de cada bloco: é onde o cursor fica para continuar
// escrevendo na linha de baixo. Sai do texto ao enviar.
export const ESPACO_INVISIVEL = '\u200B'

export interface AnexoEditor {
  blob: Blob
  nomeArquivo: string
  mimeType: string
  isAudio?: boolean
  isGravacaoAudio?: boolean
}

let proximoId = 0

function atomo(classes: string) {
  const el = document.createElement('span')
  el.contentEditable = 'false'
  el.className = classes
  return el
}

const CLASSE_CHIP = 'my-1 flex w-fit max-w-[16rem] items-center gap-1.5 rounded-lg bg-surface-200 px-2 py-1 text-xs text-surface-700'
const CLASSE_MIDIA = 'my-1 block w-fit max-w-full'

function rotulo(icone: string, texto: string) {
  const el = document.createElement('span')
  el.className = 'truncate'
  el.textContent = `${icone} ${texto}`
  return el
}

// Anexo no ponto do cursor. O arquivo fica no mapa, pela chave do elemento.
export function criarAtomoAnexo(anexos: Map<string, AnexoEditor>, anexo: AnexoEditor): HTMLElement {
  const id = `anexo-${++proximoId}`
  anexos.set(id, anexo)
  const url = URL.createObjectURL(anexo.blob)
  const mime = anexo.mimeType

  let el: HTMLElement
  if (mime.startsWith('image/')) {
    el = atomo(`${CLASSE_MIDIA} relative`)
    const img = document.createElement('img')
    img.src = url
    img.alt = anexo.nomeArquivo
    img.className = 'max-h-28 max-w-full cursor-zoom-in rounded-lg'
    // "×" no canto: remove a imagem do campo (o Backspace também remove)
    const remover = document.createElement('button')
    remover.type = 'button'
    remover.dataset.remover = 'true'
    remover.title = 'Remover imagem'
    remover.setAttribute('aria-label', 'Remover imagem')
    remover.className = 'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80'
    remover.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="pointer-events-none h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>'
    el.append(img, remover)
  } else if (mime.startsWith('video/')) {
    el = atomo(CLASSE_MIDIA)
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.preload = 'metadata'
    video.className = 'pointer-events-none max-h-28 max-w-full rounded-lg bg-black'
    el.append(video, rotulo('🎬', anexo.nomeArquivo))
  } else if (anexo.isGravacaoAudio) {
    el = atomo(CLASSE_CHIP)
    el.append(rotulo('🎤', 'Gravação de áudio'))
  } else if (anexo.isAudio) {
    el = atomo(CLASSE_CHIP)
    el.append(rotulo('🎵', anexo.nomeArquivo))
  } else {
    el = atomo(CLASSE_CHIP)
    el.append(rotulo('📄', anexo.nomeArquivo))
  }
  el.dataset.anexo = id
  el.dataset.url = url
  el.title = anexo.nomeArquivo
  return el
}

export function criarAtomoFigurinha(figurinha: string): HTMLElement {
  const el = atomo(`${CLASSE_MIDIA} h-16 w-16`)
  el.dataset.figurinha = figurinha
  el.title = nomeFigurinha(figurinha)
  Promise.all([carregarPlayerLottie(), carregarAnimacaoFigurinha(figurinha)])
    .then(([lottie, dados]) => {
      if (!el.isConnected) return
      lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: structuredClone(dados) })
    })
    .catch(() => { el.textContent = `🙂 ${nomeFigurinha(figurinha)}` })
  return el
}

export function criarAtomoMencao(nome: string, id: number): HTMLElement {
  const el = atomo('rounded-sm bg-primary-50 text-primary-600 dark:bg-primary-900/30')
  el.dataset.mencaoId = String(id)
  el.dataset.nome = nome
  el.textContent = `@${nome}`
  return el
}

const ehPecaBloco = (no: Node | null): no is HTMLElement =>
  no instanceof HTMLElement && !!(no.dataset.anexo || no.dataset.figurinha)

const soEspacoInvisivel = (texto: string) => !texto.replaceAll(ESPACO_INVISIVEL, '')

// Conteúdo que fica na mesma linha (texto, menção): entre dois desses, tirar a
// peça precisa deixar uma quebra de linha no lugar
function ficaNaLinha(no: Node | null) {
  if (!no) return false
  if (no.nodeType === Node.TEXT_NODE) return !soEspacoInvisivel(no.textContent ?? '')
  return no instanceof HTMLElement && !no.dataset.anexo && !no.dataset.figurinha && !['BR', 'DIV', 'P', 'LI'].includes(no.tagName)
}

// Tira a peça do campo, junto com o espaço invisível que vem depois dela. O
// texto de cima e o de baixo continuam em linhas separadas. Devolve o ponto
// onde a peça estava, para o cursor.
export function removerPeca(peca: HTMLElement): { no: Node; posicao: number } {
  const pai = peca.parentNode!
  const depois = peca.nextSibling
  if (depois?.nodeType === Node.TEXT_NODE) {
    const texto = depois as Text
    if (texto.data === ESPACO_INVISIVEL) texto.remove()
    else if (texto.data.startsWith(ESPACO_INVISIVEL)) texto.deleteData(0, 1)
  }
  if (peca.dataset.url) URL.revokeObjectURL(peca.dataset.url)
  const antes = peca.previousSibling
  const seguinte = peca.nextSibling
  if (ficaNaLinha(antes) && ficaNaLinha(seguinte)) peca.replaceWith(document.createElement('br'))
  else peca.remove()
  if (seguinte?.isConnected) return { no: pai, posicao: [...pai.childNodes].indexOf(seguinte as ChildNode) }
  return { no: pai, posicao: pai.childNodes.length }
}

// Peça (imagem, vídeo, arquivo, figurinha) colada no cursor, antes dele
// (Backspace) ou depois (Delete), sem contar o espaço invisível
export function pecaAoLadoDoCursor(raiz: HTMLElement, sentido: 'antes' | 'depois'): HTMLElement | null {
  const selecao = window.getSelection()
  if (!selecao?.rangeCount || !selecao.isCollapsed) return null
  const intervalo = selecao.getRangeAt(0)
  let no: Node = intervalo.startContainer
  if (!raiz.contains(no)) return null
  const antes = sentido === 'antes'
  let vizinho: Node | null
  if (no.nodeType === Node.TEXT_NODE) {
    const texto = (no as Text).data
    const lado = antes ? texto.slice(0, intervalo.startOffset) : texto.slice(intervalo.startOffset)
    if (!soEspacoInvisivel(lado)) return null
    vizinho = antes ? no.previousSibling : no.nextSibling
  } else {
    vizinho = no.childNodes[antes ? intervalo.startOffset - 1 : intervalo.startOffset] ?? null
  }
  for (;;) {
    while (vizinho?.nodeType === Node.TEXT_NODE && soEspacoInvisivel(vizinho.textContent ?? '')) {
      vizinho = antes ? vizinho.previousSibling : vizinho.nextSibling
    }
    if (vizinho || no === raiz || !no.parentNode) break
    // Começo (ou fim) de uma linha do campo: olha a linha vizinha
    vizinho = antes ? no.previousSibling : no.nextSibling
    no = no.parentNode
  }
  return ehPecaBloco(vizinho) ? vizinho : null
}

// A peça abre a linha (é a primeira do campo ou vem depois de uma quebra ou de
// outra peça): não há onde pôr o cursor acima dela
export function semLinhaAntes(peca: HTMLElement) {
  let antes = peca.previousSibling
  while (antes?.nodeType === Node.TEXT_NODE && !antes.textContent) antes = antes.previousSibling
  return !antes || ehPecaBloco(antes) || (antes instanceof HTMLElement && antes.tagName === 'BR')
}

// Peça logo acima da linha do cursor: o que vem antes do cursor, voltando pela
// linha de texto, até achar uma peça (ou uma quebra, e aí não há peça)
export function pecaAcimaDoCursor(raiz: HTMLElement): HTMLElement | null {
  const selecao = window.getSelection()
  if (!selecao?.rangeCount) return null
  const intervalo = selecao.getRangeAt(0)
  let no: Node | null = intervalo.startContainer
  if (!raiz.contains(no)) return null
  if (no === raiz) {
    no = raiz.childNodes[intervalo.startOffset - 1] ?? null
    if (ehPecaBloco(no)) return no
  } else {
    while (no && no.parentNode !== raiz) no = no.parentNode
    no = no?.previousSibling ?? null
  }
  while (no && !ehPecaBloco(no)) {
    if (no instanceof HTMLElement && ['BR', 'DIV', 'P', 'LI'].includes(no.tagName)) return null
    no = no.previousSibling
  }
  return no
}

// Cria uma linha vazia acima da peça e põe o cursor nela
export function abrirLinhaAntes(peca: HTMLElement) {
  const linha = document.createTextNode(ESPACO_INVISIVEL)
  peca.before(linha)
  const intervalo = document.createRange()
  intervalo.setStart(linha, 1)
  intervalo.collapse(true)
  const selecao = window.getSelection()
  selecao?.removeAllRanges()
  selecao?.addRange(intervalo)
}

// Cursor na linha vazia acima de uma peça (a de abrirLinhaAntes): Backspace ou
// Delete desiste da linha, sem apagar a peça. O cursor vai para logo abaixo dela.
export function removerLinhaVaziaAntes(raiz: HTMLElement) {
  const selecao = window.getSelection()
  if (!selecao?.rangeCount || !selecao.isCollapsed) return false
  const linha = selecao.getRangeAt(0).startContainer
  if (linha.nodeType !== Node.TEXT_NODE || !raiz.contains(linha) || !soEspacoInvisivel(linha.textContent ?? '')) return false
  const peca = linha.nextSibling
  if (!ehPecaBloco(peca)) return false
  linha.parentNode!.removeChild(linha)
  const intervalo = document.createRange()
  const depois = peca.nextSibling
  if (depois?.nodeType === Node.TEXT_NODE) intervalo.setStart(depois, (depois as Text).data.startsWith(ESPACO_INVISIVEL) ? 1 : 0)
  else intervalo.setStartAfter(peca)
  intervalo.collapse(true)
  selecao.removeAllRanges()
  selecao.addRange(intervalo)
  return true
}

// Não há nada no campo: nem texto, nem peça
export function editorVazio(raiz: HTMLElement) {
  return !raiz.textContent?.replaceAll(ESPACO_INVISIVEL, '').trim() && !raiz.querySelector('[data-anexo],[data-figurinha]')
}

// Libera as URLs das prévias e esquece os arquivos que saíram do campo
export function limparAnexosForaDoCampo(raiz: HTMLElement, anexos: Map<string, AnexoEditor>) {
  const presentes = new Set([...raiz.querySelectorAll<HTMLElement>('[data-anexo]')].map((el) => el.dataset.anexo))
  for (const id of [...anexos.keys()]) {
    if (!presentes.has(id)) anexos.delete(id)
  }
}

export function liberarPrevias(raiz: HTMLElement) {
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-url]')) {
    if (el.dataset.url) URL.revokeObjectURL(el.dataset.url)
  }
}
