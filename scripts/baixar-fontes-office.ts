// Baixa do Google Fonts as fontes que o visualizador do Office (@silurus/ooxml)
// usa no lugar das do Office (Carlito no lugar da Calibri, Caladea no da
// Cambria...) para public/fontes/office, com o fontes.css que as declara.
// Rode com: bun scripts/baixar-fontes-office.ts
//
// Licença: todas são SIL Open Font License 1.1, exceto Roboto (Apache 2.0) e
// Ubuntu (Ubuntu Font Licence 1.0). Os arquivos ficam no app: em uso, nada vem
// do Google.
//
// A lista (FONTES_OFFICE, em src/utils/fontesOffice.ts) é a da biblioteca, sem
// as de árabe e as CJK (muito grandes). Para pôr ou tirar uma fonte, mude a
// lista e rode de novo.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FONTES_OFFICE } from '../src/utils/fontesOffice'

// Eixos no endereço do Google: os pesos da lista, normal e itálico
const FONTES = Object.entries(FONTES_OFFICE).map(([familia, pesos]): [string, string] =>
  [familia, `ital,wght@${[0, 1].flatMap((italico) => pesos.map((peso) => `${italico},${peso}`)).join(';')}`])

// Só o alfabeto latino (português incluído) e o latino estendido
const SUBCONJUNTOS = ['latin', 'latin-ext']

// Com o agente de um navegador atual, o Google manda woff2 por subconjunto
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const raiz = join(import.meta.dir, '..')
const pasta = join(raiz, 'public', 'fontes', 'office')
rmSync(pasta, { recursive: true, force: true })
mkdirSync(pasta, { recursive: true })

const declaracoes: string[] = []
let total = 0
for (const [familia, eixos] of FONTES) {
  const resposta = await fetch(`https://fonts.googleapis.com/css2?family=${familia.replaceAll(' ', '+')}:${eixos}&display=swap`, {
    headers: { 'User-Agent': AGENTE },
  })
  if (!resposta.ok) throw new Error(`${familia}: ${resposta.status}`)
  const css = await resposta.text()
  // Cada bloco vem precedido de um comentário com o subconjunto: /* latin */
  for (const [, subconjunto, bloco] of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    if (!subconjunto || !bloco || !SUBCONJUNTOS.includes(subconjunto)) continue
    const estilo = /font-style:\s*(\w+)/.exec(bloco)?.[1] ?? 'normal'
    const peso = /font-weight:\s*(\d+)/.exec(bloco)?.[1] ?? '400'
    const endereco = /url\((https:[^)]+\.woff2)\)/.exec(bloco)?.[1]
    if (!endereco) throw new Error(`${familia}: bloco sem woff2`)
    const arquivo = `${familia.toLowerCase().replaceAll(' ', '-')}-${peso}${estilo === 'italic' ? '-italico' : ''}-${subconjunto}.woff2`
    const fonte = await fetch(endereco)
    if (!fonte.ok) throw new Error(`${arquivo}: ${fonte.status}`)
    const dados = new Uint8Array(await fonte.arrayBuffer())
    writeFileSync(join(pasta, arquivo), dados)
    total += dados.byteLength
    declaracoes.push(bloco.replace(/src:\s*url\([^)]+\)/, `src: url(./${arquivo})`))
  }
}

writeFileSync(join(pasta, 'fontes.css'), `/* Gerado por scripts/baixar-fontes-office.ts: não edite aqui. */\n${declaracoes.join('\n')}\n`)
console.log(`${declaracoes.length} arquivos (${(total / 1024).toFixed(0)} KB) em ${pasta}`)
