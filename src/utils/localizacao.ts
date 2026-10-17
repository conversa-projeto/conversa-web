// Localização na mensagem (conteúdo tipo 9): JSON com um ponto (o local) ou
// dois (origem e destino do trajeto). O trajeto pode levar a rota pelas ruas
// (polyline do OSRM, precisão 5), a distância em metros e a duração em segundos.
// O servidor confere o formato (mensagens.ts, localizacaoValida).

export interface PontoLocalizacao {
  lat: number
  lng: number
  nome?: string
}

export interface Localizacao {
  pontos: PontoLocalizacao[]
  rota?: string
  distancia?: number
  duracao?: number
}

export function lerLocalizacao(conteudo: string): Localizacao | null {
  try {
    const dados = JSON.parse(conteudo) as Localizacao
    return Array.isArray(dados?.pontos) && dados.pontos.length >= 1 ? dados : null
  } catch {
    return null
  }
}

export const ehTrajeto = (localizacao: Localizacao) => localizacao.pontos.length === 2

// Polyline do Google/OSRM: pares de diferenças em base 64 deslocada
export function decodificarRota(rota: string): [number, number][] {
  const pontos: [number, number][] = []
  let indice = 0
  let lat = 0
  let lng = 0
  const proximo = () => {
    let resultado = 0
    let deslocamento = 0
    let byte: number
    do {
      byte = rota.charCodeAt(indice++) - 63
      resultado |= (byte & 0x1f) << deslocamento
      deslocamento += 5
    } while (byte >= 0x20 && indice < rota.length)
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1
  }
  while (indice < rota.length) {
    lat += proximo()
    lng += proximo()
    pontos.push([lat / 1e5, lng / 1e5])
  }
  return pontos
}

export function formatarCoordenadas({ lat, lng }: PontoLocalizacao) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function formatarDistancia(metros: number) {
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: metros < 100_000 ? 1 : 0 })} km`
}

export function formatarTempoTrajeto(segundos: number) {
  const minutos = Math.max(1, Math.round(segundos / 60))
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}

// Linha reta entre dois pontos (haversine), quando a rota pelas ruas não veio
export function distanciaReta(a: PontoLocalizacao, b: PontoLocalizacao) {
  const raio = 6_371_000
  const rad = (graus: number) => (graus * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * raio * Math.asin(Math.sqrt(h))
}

export const nomePonto = (ponto: PontoLocalizacao) => ponto.nome?.trim() || formatarCoordenadas(ponto)

// Uma linha: "Praça da Sé" ou "Casa → Trabalho · 12,3 km"
export function resumoLocalizacao(localizacao: Localizacao) {
  if (!ehTrajeto(localizacao)) return nomePonto(localizacao.pontos[0]!)
  const caminho = localizacao.pontos.map(nomePonto).join(' → ')
  return localizacao.distancia === undefined ? caminho : `${caminho} · ${formatarDistancia(localizacao.distancia)}`
}

// Linha de baixo do trajeto: "12,3 km · 18 min de carro" ou "10 km em linha reta"
export function descricaoTrajeto(localizacao: Localizacao) {
  if (localizacao.distancia === undefined) return 'Trajeto'
  const distancia = formatarDistancia(localizacao.distancia)
  return localizacao.duracao === undefined
    ? `Trajeto · ${distancia} em linha reta`
    : `Trajeto · ${distancia} · ${formatarTempoTrajeto(localizacao.duracao)} de carro`
}

// "Abrir no Google Maps": o ponto ou o trajeto de carro (no celular, abre o app)
export function linkMapa(localizacao: Localizacao) {
  const [origem, destino] = localizacao.pontos
  if (origem && destino) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origem.lat}%2C${origem.lng}&destination=${destino.lat}%2C${destino.lng}&travelmode=driving`
  }
  return `https://www.google.com/maps/search/?api=1&query=${origem!.lat}%2C${origem!.lng}`
}

// Coordenadas digitadas na busca: "-23.55, -46.63" (ou com espaço no lugar da vírgula)
export function lerCoordenadas(texto: string): PontoLocalizacao | null {
  const partes = texto.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/)
  if (!partes) return null
  const lat = Number(partes[1]!.replace(',', '.'))
  const lng = Number(partes[2]!.replace(',', '.'))
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}
