import { TipoConteudo } from '../types/api'
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
  if (!nome) return ''
  return nome
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function resumoMensagem(item: Mensagem): string {
  const texto = item.conteudos.find((c) => c.tipo === TipoConteudo.Texto)?.conteudo
  if (texto) return texto
  if (item.conteudos.some((c) => c.tipo === TipoConteudo.Imagem)) return 'Imagem'
  if (item.conteudos.some((c) => c.tipo === TipoConteudo.Audio)) return '\u00C1udio'
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

const REGEX_EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\s]+$/u
const REGEX_HAS_EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u

export function isMensagemSoEmoji(texto: string): boolean {
  const valor = texto.trim()
  if (!valor) return false
  return REGEX_EMOJI_ONLY.test(valor) && REGEX_HAS_EMOJI.test(valor)
}

export function classeTextoMensagem(texto: string): string {
  return isMensagemSoEmoji(texto) ? 'text-4xl leading-tight' : 'text-sm'
}

const CHECK = '\u2713'
const CHECK_DUPLO = '\u2713\u2713'

export function statusEntrega(mensagem: Mensagem): string {
  if (mensagem.enviando || mensagem.id < 0) return ''
  if (mensagem.visualizada) return CHECK_DUPLO
  if (mensagem.recebida) return CHECK_DUPLO
  return CHECK
}

export function statusEntregaClasse(mensagem: Mensagem): string {
  if (mensagem.enviando || mensagem.id < 0) return 'text-surface-300'
  if (mensagem.visualizada) return 'text-info-300'
  return 'text-surface-300'
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

const REGEX_LINKS = /(https?:\/\/[^\s<>)"',;]+|www\.[^\s<>)"',;]+)/g

export function parseLinks(texto: string): SegmentoTextoLink[] {
  REGEX_LINKS.lastIndex = 0
  const segmentos: SegmentoTextoLink[] = []
  let ultimo = 0
  let match: RegExpExecArray | null
  while ((match = REGEX_LINKS.exec(texto)) !== null) {
    if (match.index > ultimo) {
      segmentos.push({ tipo: 'texto', conteudo: texto.slice(ultimo, match.index) })
    }
    // Remove pontuação final
    let url = match[0]
    while (url.length > 1 && /[.,;:!?)]+$/.test(url)) {
      url = url.slice(0, -1)
    }
    segmentos.push({ tipo: 'link', conteudo: url })
    ultimo = match.index + url.length
    REGEX_LINKS.lastIndex = ultimo
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

export function formatarDuracao(segundos?: number | null): string {
  if (segundos == null) return '--:--'
  const total = Math.max(0, Math.floor(segundos))
  const min = Math.floor(total / 60)
  const seg = total % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}
