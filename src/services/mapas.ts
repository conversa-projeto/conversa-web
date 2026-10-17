import { decodificarRota, type PontoLocalizacao } from '../utils/localizacao'

// Serviços públicos do OpenStreetMap, chamados direto do navegador: o mapa
// (tile.openstreetmap.org, no MapaLeaflet), a busca de endereço (Nominatim) e
// a rota pelas ruas (OSRM). Uso leve, como pedem as regras deles: a busca só
// sai quando a pessoa pede, e a rota é calculada uma vez, no envio.

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = 'https://router.project-osrm.org'

interface ResultadoNominatim {
  lat: string
  lon: string
  display_name: string
}

export async function buscarEndereco(texto: string, sinal?: AbortSignal): Promise<PontoLocalizacao[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&accept-language=pt-BR&q=${encodeURIComponent(texto)}`
  const resposta = await fetch(url, { signal: sinal })
  if (!resposta.ok) throw new Error('A busca de endereço não respondeu.')
  const lista = (await resposta.json()) as ResultadoNominatim[]
  return lista.map((item) => ({ lat: Number(item.lat), lng: Number(item.lon), nome: item.display_name }))
}

// Nome do lugar num ponto (GPS ou clique no mapa); sem resposta, fica sem nome
export async function nomeDoLugar(ponto: PontoLocalizacao, sinal?: AbortSignal): Promise<string | undefined> {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&accept-language=pt-BR&lat=${ponto.lat}&lon=${ponto.lng}`
    const resposta = await fetch(url, { signal: sinal })
    if (!resposta.ok) return undefined
    return ((await resposta.json()) as Partial<ResultadoNominatim>).display_name
  } catch {
    return undefined
  }
}

export interface Rota {
  rota: string
  distancia: number
  duracao: number
  linha: [number, number][]
}

// Rota de carro entre os dois pontos; null quando o serviço não acha ou não responde
export async function calcularRota(origem: PontoLocalizacao, destino: PontoLocalizacao, sinal?: AbortSignal): Promise<Rota | null> {
  try {
    const url = `${OSRM}/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=polyline`
    const resposta = await fetch(url, { signal: sinal })
    if (!resposta.ok) return null
    const dados = (await resposta.json()) as { code: string; routes?: { geometry: string; distance: number; duration: number }[] }
    const rota = dados.code === 'Ok' ? dados.routes?.[0] : undefined
    if (!rota) return null
    return { rota: rota.geometry, distancia: Math.round(rota.distance), duracao: Math.round(rota.duration), linha: decodificarRota(rota.geometry) }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    return null
  }
}

// Posição do aparelho (GPS ou a que o navegador estimar)
export function posicaoAtual(): Promise<PontoLocalizacao> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este dispositivo não informa a posição.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (erro) => reject(new Error(erro.code === erro.PERMISSION_DENIED
        ? 'O acesso à localização foi negado.'
        : 'Não foi possível obter a posição deste dispositivo.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  })
}
