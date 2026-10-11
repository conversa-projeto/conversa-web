import { computed, ref } from 'vue'
import { emojiNome } from '../utils/emojiNomes'
import { emojiAparece } from '../utils/suporteEmoji'

// Catálogo de emojis do seletor (public/emojis/pt.json, gerado por
// scripts/gerar-emojis.ts): baixado na primeira vez que o seletor abre, sem os
// que o navegador não desenha. Também guarda os usados por último.

export interface EmojiDoCatalogo {
  emoji: string
  nome: string
  /** Nome, palavras-chave e o nome do app, sem acento, para a pesquisa */
  busca: string
}

export interface CategoriaDeEmojis {
  id: string
  nome: string
  icone: string
  emojis: EmojiDoCatalogo[]
}

interface ArquivoDoCatalogo {
  categorias: { id: string; nome: string; icone: string; emojis: [string, string, string, number][] }[]
}

const CHAVE_RECENTES = 'conversa.emojisRecentes'
const MAXIMO_RECENTES = 32
const MAXIMO_RESULTADOS = 200
// Sem nada usado ainda, os recentes começam pelos mais comuns
const POPULARES = ['😂', '❤️', '😍', '🤣', '😊', '🙏', '😭', '😘', '👍', '😅', '🔥', '🥰', '😎', '💕', '🎉', '✨']

export function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

const categorias = ref<CategoriaDeEmojis[]>([])
const carregado = ref(false)
let carregando: Promise<void> | null = null

function carregar() {
  carregando ??= fetch('/emojis/pt.json')
    .then((resposta) => (resposta.ok ? resposta.json() as Promise<ArquivoDoCatalogo> : Promise.reject(new Error(String(resposta.status)))))
    .then((arquivo) => {
      categorias.value = arquivo.categorias
        .map(({ id, nome, icone, emojis }) => ({
          id,
          nome,
          icone,
          emojis: emojis
            .filter(([, , , versao]) => emojiAparece(versao))
            .map(([emoji, nomeDoEmoji, palavras]) => ({
              emoji,
              nome: nomeDoEmoji,
              busca: ` ${semAcento(`${nomeDoEmoji} ${palavras} ${emojiNome(emoji)}`)}`.replace(/[^\p{L}\p{N}]+/gu, ' '),
            })),
        }))
        .filter((categoria) => categoria.emojis.length > 0)
      carregado.value = true
    })
    // Sem o catálogo (sem rede, por exemplo): ficam os recentes; tenta de novo na próxima vez
    .catch(() => { carregando = null })
  return carregando
}

function lerRecentes() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_RECENTES) ?? 'null') as unknown
    return Array.isArray(salvos) && salvos.length ? salvos.filter((e): e is string => typeof e === 'string') : POPULARES
  } catch {
    return POPULARES
  }
}

const recentes = ref<string[]>(lerRecentes())

function usarEmoji(emoji: string) {
  recentes.value = [emoji, ...recentes.value.filter((e) => e !== emoji)].slice(0, MAXIMO_RECENTES)
  try {
    localStorage.setItem(CHAVE_RECENTES, JSON.stringify(recentes.value))
  } catch {
    // ficam só até fechar a página
  }
}

// Cada palavra digitada precisa começar alguma palavra do nome ou das palavras-chave
function pesquisar(termo: string): EmojiDoCatalogo[] {
  const palavras = semAcento(termo).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (!palavras.length) return []
  const achados: EmojiDoCatalogo[] = []
  for (const categoria of categorias.value) {
    for (const item of categoria.emojis) {
      if (palavras.every((palavra) => item.busca.includes(` ${palavra}`))) {
        achados.push(item)
        if (achados.length >= MAXIMO_RESULTADOS) return achados
      }
    }
  }
  return achados
}

export function useEmojis() {
  void carregar()
  return { categorias: computed(() => categorias.value), carregado: computed(() => carregado.value), recentes: computed(() => recentes.value), usarEmoji, pesquisar }
}
