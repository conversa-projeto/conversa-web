// Gera o catálogo de emojis do seletor em public/emojis/pt.json.
// Rode com: bun scripts/gerar-emojis.ts
//
// Os dados vêm do emojibase-data (MIT, só na geração): nome e palavras-chave em
// português, categoria e versão do Unicode. Sem tons de pele (só o amarelo
// padrão) e sem bandeiras. O seletor baixa o arquivo quando abre pela primeira vez e esconde
// as versões que o navegador não desenha (src/utils/suporteEmoji.ts).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import dados from 'emojibase-data/pt/data.json' with { type: 'json' }

// Categorias do emojibase (o grupo 2, "componentes", são peças de outros
// emojis; o 9, bandeiras, fica de fora)
const CATEGORIAS = [
  { grupo: 0, id: 'carinhas', nome: 'Carinhas e emoções', icone: '😀' },
  { grupo: 1, id: 'pessoas', nome: 'Pessoas e corpo', icone: '👋' },
  { grupo: 3, id: 'natureza', nome: 'Animais e natureza', icone: '🐶' },
  { grupo: 4, id: 'comida', nome: 'Comida e bebida', icone: '🍔' },
  { grupo: 5, id: 'viagens', nome: 'Viagens e lugares', icone: '✈️' },
  { grupo: 6, id: 'atividades', nome: 'Atividades', icone: '⚽' },
  { grupo: 7, id: 'objetos', nome: 'Objetos', icone: '💡' },
  { grupo: 8, id: 'simbolos', nome: 'Símbolos', icone: '❤️' },
]

interface Emoji {
  emoji: string
  label: string
  group?: number
  order?: number
  tags?: string[]
  version: number
}

const lista = (dados as Emoji[]).filter((item) => item.group !== undefined && item.group !== 2 && item.group !== 9)

// O emojibase põe o seletor de variação (U+FE0F) em todos ("👍️"); o Unicode só
// o pede quando o caractere sozinho seria texto ("❤️"). Sem ele onde sobra, o
// emoji é o mesmo das reações rápidas e da digitação, e as reações não se dividem.
function semVariacaoQueSobra(emoji: string) {
  const partes = [...emoji]
  return partes.length === 2 && partes[1] === '️' && /\p{Emoji_Presentation}/u.test(partes[0]!) ? partes[0]! : emoji
}

// Cada emoji como [emoji, nome, palavras-chave, versão], para o arquivo ficar pequeno
const catalogo = {
  categorias: CATEGORIAS.map(({ grupo, id, nome, icone }) => ({
    id,
    nome,
    icone,
    emojis: lista
      .filter((item) => item.group === grupo)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item) => [semVariacaoQueSobra(item.emoji), item.label.charAt(0).toUpperCase() + item.label.slice(1), (item.tags ?? []).join(' '), item.version]),
  })),
}

const pasta = join(import.meta.dir, '..', 'public', 'emojis')
mkdirSync(pasta, { recursive: true })
const arquivo = join(pasta, 'pt.json')
writeFileSync(arquivo, JSON.stringify(catalogo))
const total = catalogo.categorias.reduce((soma, categoria) => soma + categoria.emojis.length, 0)
console.log(`${total} emojis em ${catalogo.categorias.length} categorias -> ${arquivo}`)
