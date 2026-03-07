import type { ConteudoMensagem, Mensagem } from '../types/api'

export interface SegmentoTextoLink {
  tipo: 'texto' | 'link'
  conteudo: string
}

export function formatarHora(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatarDiaSeparador(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function iniciaisUsuario(nome: string): string {
  return nome
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function resumoMensagem(item: Mensagem): string {
  const texto = item.conteudos.find((c) => c.tipo === 1)?.conteudo
  if (texto) return texto
  if (item.conteudos.some((c) => c.tipo === 2)) return 'Imagem'
  if (item.conteudos.some((c) => c.tipo === 4)) return '\u00C1udio'
  return 'Arquivo'
}

export function normalizarExtensaoArquivo(conteudo: ConteudoMensagem): string {
  const extBruta = conteudo.extensao || (conteudo.nome?.split('.').pop() || '')
  return extBruta.trim().toLowerCase().replace(/^\./, '')
}

export function isVideoConteudo(conteudo: ConteudoMensagem): boolean {
  const ext = normalizarExtensaoArquivo(conteudo)
  return ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext)
}

export function isMensagemSoEmoji(texto: string): boolean {
  const valor = texto.trim()
  if (!valor) return false
  const somenteEmojiOuSeparador = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\s]+$/u
  const temEmoji = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u
  return somenteEmojiOuSeparador.test(valor) && temEmoji.test(valor)
}

export function classeTextoMensagem(texto: string): string {
  return isMensagemSoEmoji(texto) ? 'text-4xl leading-tight' : 'text-sm'
}

export function statusEntrega(mensagem: Mensagem): string {
  if (mensagem.enviando || mensagem.id < 0) return ''
  const check = String.fromCharCode(10003)
  const checkDuplo = check + check
  if (mensagem.visualizada) return checkDuplo
  if (mensagem.recebida) return checkDuplo
  return check
}

export function statusEntregaClasse(mensagem: Mensagem): string {
  if (mensagem.visualizada) return 'text-sky-300'
  return 'text-slate-300'
}

export function extensaoPorMime(mime: string): string {
  const tipo = mime.toLowerCase()
  if (tipo.includes('png')) return 'png'
  if (tipo.includes('jpeg') || tipo.includes('jpg')) return 'jpg'
  if (tipo.includes('webp')) return 'webp'
  if (tipo.includes('gif')) return 'gif'
  if (tipo.includes('bmp')) return 'bmp'
  return 'png'
}

export function parseLinks(texto: string): SegmentoTextoLink[] {
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
  const segmentos: SegmentoTextoLink[] = []
  let ultimo = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimo) {
      segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo, match.index) })
    }
    segmentos.push({ tipo: 'link', conteudo: match[0] })
    ultimo = match.index + match[0].length
  }
  if (ultimo < texto.length) {
    segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo) })
  }
  return segmentos
}

export function formatarUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}
