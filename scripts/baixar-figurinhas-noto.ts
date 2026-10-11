// Baixa o pacote de figurinhas "Noto" (emojis animados do Google, Lottie) para
// public/figurinhas/noto e gera o catálogo dele em src/utils/figurinhasNoto.ts.
// Rode com: bun scripts/baixar-figurinhas-noto.ts
//
// Licença: Animated Noto Emoji, © Google, CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/). Exige o crédito, que fica no
// seletor de figurinhas. Os arquivos ficam no app: em uso, nada vem do Google.
//
// Para pôr ou tirar uma figurinha, mude a lista abaixo e rode de novo. A que o
// Google não tiver animada é pulada (e avisada).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// [código do emoji no endereço do Google, nome do arquivo, nome no seletor]
const FIGURINHAS: [string, string, string][] = [
  ['1f602', 'chorando-de-rir', 'Chorando de rir'],
  ['1f923', 'rolando-de-rir', 'Rolando de rir'],
  ['1f60a', 'sorriso', 'Sorriso'],
  ['1f605', 'ufa', 'Ufa'],
  ['1f609', 'piscadinha', 'Piscadinha'],
  ['1f60d', 'apaixonado', 'Apaixonado'],
  ['1f970', 'cheio-de-amor', 'Cheio de amor'],
  ['1f618', 'beijinho', 'Beijinho'],
  ['1f60e', 'legal', 'Legal'],
  ['1f929', 'deslumbrado', 'Deslumbrado'],
  ['1f973', 'festejando', 'Festejando'],
  ['1f917', 'abraco', 'Abraço'],
  ['1f92d', 'ops', 'Ops'],
  ['1f914', 'pensando', 'Pensando'],
  ['1f928', 'desconfiado', 'Desconfiado'],
  ['1f644', 'revirando-os-olhos', 'Revirando os olhos'],
  ['1f643', 'de-cabeca-para-baixo', 'De cabeça para baixo'],
  ['1f633', 'envergonhado', 'Envergonhado'],
  ['1f97a', 'por-favorzinho', 'Por favorzinho'],
  ['1f622', 'triste', 'Triste'],
  ['1f62d', 'chorando', 'Chorando'],
  ['1f621', 'bravo', 'Bravo'],
  ['1f631', 'assustado', 'Assustado'],
  ['1f92f', 'cabeca-explodindo', 'Cabeça explodindo'],
  ['1f971', 'bocejando', 'Bocejando'],
  ['1f634', 'dormindo', 'Dormindo'],
  ['1f912', 'doente', 'Doente'],
  ['1f480', 'morri', 'Morri'],
  ['1f921', 'palhaco', 'Palhaço'],
  ['1f47b', 'fantasma', 'Fantasma'],
  ['1f44d', 'joinha', 'Joinha'],
  ['1f44e', 'negativo', 'Negativo'],
  ['1f44f', 'palmas', 'Palmas'],
  ['1f64c', 'aleluia', 'Aleluia'],
  ['1f64f', 'por-favor', 'Por favor'],
  ['1f44b', 'tchau', 'Tchau'],
  ['1f4aa', 'forca', 'Força'],
  ['1f91d', 'combinado', 'Combinado'],
  ['270c_fe0f', 'paz', 'Paz'],
  ['1f440', 'de-olho', 'De olho'],
  ['2764_fe0f', 'coracao', 'Coração'],
  ['1f494', 'coracao-partido', 'Coração partido'],
  ['1f525', 'fogo', 'Fogo'],
  ['1f4af', 'cem', 'Cem'],
  ['2728', 'brilhos', 'Brilhos'],
  ['1f389', 'festa', 'Festa'],
  ['1f38a', 'confete', 'Confete'],
  ['1f381', 'presente', 'Presente'],
  ['1f382', 'bolo', 'Bolo'],
  ['1f680', 'foguete', 'Foguete'],
  ['1f4a1', 'ideia', 'Ideia'],
  ['26a1', 'raio', 'Raio'],
  ['1f308', 'arco-iris', 'Arco-íris'],
  ['2615', 'cafe', 'Café'],
  ['1f37b', 'brinde', 'Brinde'],
]

const raiz = join(import.meta.dir, '..')
const pasta = join(raiz, 'public', 'figurinhas', 'noto')
mkdirSync(pasta, { recursive: true })
// Figurinha que saiu da lista sai da pasta também
for (const arquivo of readdirSync(pasta)) {
  if (!FIGURINHAS.some(([, nome]) => `${nome}.json` === arquivo)) rmSync(join(pasta, arquivo))
}

const baixadas: [string, string][] = []
for (const [codigo, nome, titulo] of FIGURINHAS) {
  const resposta = await fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${codigo}/lottie.json`)
  if (!resposta.ok) {
    console.warn(`⚠  ${titulo} (${codigo}) não tem animação no Noto: ${resposta.status}`)
    continue
  }
  // Valida e regrava sem espaços
  const dados = await resposta.json() as { v?: string; layers?: unknown[] }
  if (!dados.v || !Array.isArray(dados.layers)) {
    console.warn(`⚠  ${titulo} (${codigo}) não veio em Lottie`)
    continue
  }
  writeFileSync(join(pasta, `${nome}.json`), JSON.stringify(dados))
  baixadas.push([nome, titulo])
}

const catalogo = `// Gerado por scripts/baixar-figurinhas-noto.ts: não edite aqui.
// Animated Noto Emoji, © Google, CC BY 4.0
import type { PacoteFigurinhas } from './figurinhas'

export const PACOTE_NOTO: PacoteFigurinhas = {
  id: 'noto',
  nome: 'Noto',
  credito: { texto: 'Animated Noto Emoji © Google, CC BY 4.0', link: 'https://creativecommons.org/licenses/by/4.0/' },
  figurinhas: [
${baixadas.map(([nome, titulo]) => `    { id: 'noto/${nome}', nome: '${titulo}' },`).join('\n')}
  ],
}
`
writeFileSync(join(raiz, 'src', 'utils', 'figurinhasNoto.ts'), catalogo)
console.log(`${baixadas.length} de ${FIGURINHAS.length} figurinhas em ${pasta}`)
