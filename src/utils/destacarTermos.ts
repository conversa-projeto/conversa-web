export interface ParteTexto {
  texto: string
  destaque: boolean
}

// Minúscula e sem acento, letra a letra, cada letra numa posição só (emoji e
// o que não cabe numa viram um marcador): a posição no texto comparado é a
// mesma da letra no original, para o destaque cair no lugar certo
function normalizar(texto: string) {
  return [...texto].map((letra) => {
    const sem = letra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return sem.length === 1 ? sem : '￿'
  }).join('')
}

// Palavras da pesquisa com 3 letras ou mais (de, a, o... marcariam tudo)
function termosDaPesquisa(pesquisa: string) {
  const termos = (normalizar(pesquisa).match(/[\p{L}\p{N}]{3,}/gu) ?? [])
  return [...new Set(termos)].sort((a, b) => b.length - a.length)
}

// Partes do texto com as palavras da pesquisa destacadas, sem diferenciar
// maiúscula nem acento ("agua" acha "Água")
export function partesDestacadas(texto: string, pesquisa: string): ParteTexto[] {
  const termos = termosDaPesquisa(pesquisa)
  if (!termos.length || !texto) return texto ? [{ texto, destaque: false }] : []
  const letras = [...texto]
  const comparado = normalizar(texto)
  const marcadas = new Array<boolean>(letras.length).fill(false)
  for (const termo of termos) {
    let desde = 0
    for (let achou = comparado.indexOf(termo); achou >= 0; achou = comparado.indexOf(termo, desde)) {
      for (let i = achou; i < achou + termo.length; i++) marcadas[i] = true
      desde = achou + termo.length
    }
  }
  const partes: ParteTexto[] = []
  letras.forEach((letra, i) => {
    const ultima = partes[partes.length - 1]
    if (ultima && ultima.destaque === marcadas[i]) ultima.texto += letra
    else partes.push({ texto: letra, destaque: marcadas[i]! })
  })
  return partes
}
