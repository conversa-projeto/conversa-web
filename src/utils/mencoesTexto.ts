// Menções no campo de texto. O campo mostra "@Nome" e guarda à parte o id de
// cada menção inserida; no envio o texto volta ao formato "@[Nome](id)".

export interface MencaoInserida {
  nome: string
  id: number
}

export interface TrechoCampo {
  texto: string
  mencao?: MencaoInserida
}

const MENCAO_CRUA = /@\[([^\]]+)\]\((\d+)\)/g

// Divide o texto em trechos, marcando cada "@Nome" de uma menção inserida.
// O nome precisa terminar ali: "@Ana" não marca o começo de "@Anabela".
export function dividirMencoes(texto: string, mencoes: MencaoInserida[]): TrechoCampo[] {
  const ordenadas = [...mencoes].sort((a, b) => b.nome.length - a.nome.length)
  const trechos: TrechoCampo[] = []
  let inicio = 0
  let i = 0
  while (i < texto.length) {
    const mencao = texto[i] === '@'
      ? ordenadas.find((m) => texto.startsWith(`@${m.nome}`, i) && !/[\p{L}\p{N}_]/u.test(texto[i + m.nome.length + 1] ?? ''))
      : undefined
    if (!mencao) {
      i++
      continue
    }
    if (i > inicio) trechos.push({ texto: texto.slice(inicio, i) })
    trechos.push({ texto: `@${mencao.nome}`, mencao })
    i += mencao.nome.length + 1
    inicio = i
  }
  if (inicio < texto.length) trechos.push({ texto: texto.slice(inicio) })
  return trechos
}

export function textoParaEnvio(texto: string, mencoes: MencaoInserida[]) {
  if (!mencoes.length) return texto
  return dividirMencoes(texto, mencoes)
    .map((t) => (t.mencao ? `@[${t.mencao.nome}](${t.mencao.id})` : t.texto))
    .join('')
}

// Texto colado ou vindo de fora com "@[Nome](id)": mostra "@Nome" e devolve as
// menções encontradas
export function extrairMencoesCruas(texto: string): { texto: string; mencoes: MencaoInserida[] } {
  const mencoes: MencaoInserida[] = []
  const limpo = texto.replace(MENCAO_CRUA, (_, nome: string, id: string) => {
    mencoes.push({ nome, id: Number(id) })
    return `@${nome}`
  })
  return { texto: limpo, mencoes }
}
