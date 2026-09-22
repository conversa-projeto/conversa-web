// Atalhos de texto que viram emoji ao digitar, como :) e \o/.
// So valem como palavra solta: precedidos de inicio ou espaco e seguidos de
// espaco (ou do envio), para nao mexer em URLs e codigo.

const ATALHOS: Record<string, string> = {
  ':)': '🙂',
  ':-)': '🙂',
  ':D': '😃',
  ':-D': '😃',
  'xD': '😆',
  'XD': '😆',
  ';)': '😉',
  ';-)': '😉',
  ':(': '🙁',
  ':-(': '🙁',
  ":'(": '😢',
  ':P': '😛',
  ':p': '😛',
  ':O': '😮',
  ':o': '😮',
  ':|': '😐',
  ':/': '😕',
  ':*': '😘',
  '<3': '❤️',
  '\\o/': '🙌',
}

function escapar(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

const alternativas = Object.keys(ATALHOS)
  .sort((a, b) => b.length - a.length)
  .map(escapar)
  .join('|')

// Atalho no fim do trecho, logo antes de um espaco ou quebra de linha.
const ANTES_DO_ESPACO = new RegExp(`(^|\\s)(${alternativas})(\\s)$`)
// Atalho no fim da mensagem, ao enviar.
const NO_FIM = new RegExp(`(^|\\s)(${alternativas})$`)

// Dentro de bloco ou trecho de codigo o texto fica como esta.
function dentroDeCodigo(antes: string) {
  const blocos = antes.split('```').length - 1
  if (blocos % 2 === 1) return true
  const semBlocos = antes.split('```').filter((_, i) => i % 2 === 0).join('')
  return (semBlocos.split('`').length - 1) % 2 === 1
}

// Troca o atalho que acabou de ser fechado por um espaco antes do cursor.
// Retorna o texto novo e a nova posicao do cursor, ou null se nao ha o que trocar.
export function substituirAtalhoAntesDoCursor(texto: string, cursor: number): { texto: string; cursor: number } | null {
  const antes = texto.slice(0, cursor)
  const achado = antes.match(ANTES_DO_ESPACO)
  if (!achado || achado.index === undefined || dentroDeCodigo(antes)) return null
  const [, inicio, atalho, espaco] = achado
  const novoAntes = antes.slice(0, achado.index) + inicio + ATALHOS[atalho] + espaco
  return { texto: novoAntes + texto.slice(cursor), cursor: novoAntes.length }
}

// Troca o atalho que ficou no fim da mensagem, sem espaco depois.
export function substituirAtalhoNoFim(texto: string): string {
  const achado = texto.match(NO_FIM)
  if (!achado || achado.index === undefined || dentroDeCodigo(texto)) return texto
  const [, inicio, atalho] = achado
  return texto.slice(0, achado.index) + inicio + ATALHOS[atalho]
}
