import { describe, expect, test } from 'bun:test'
import {
  decodificarRota, descricaoTrajeto, distanciaReta, formatarDistancia, formatarTempoTrajeto, lerCoordenadas, lerLocalizacao, linkMapa, resumoLocalizacao,
} from '@/utils/localizacao'

describe('localização na mensagem', () => {
  test('lê o JSON do conteúdo e recusa o que não é local', () => {
    expect(lerLocalizacao('{"pontos":[{"lat":-23.5,"lng":-46.6}]}')).toEqual({ pontos: [{ lat: -23.5, lng: -46.6 }] })
    for (const conteudo of ['', 'texto', '{}', '{"pontos":[]}']) expect(lerLocalizacao(conteudo)).toBeNull()
  })

  test('decodifica a polyline do OSRM (exemplo da documentação do Google)', () => {
    expect(decodificarRota('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]])
  })

  test('coordenadas digitadas, com ponto ou vírgula decimal', () => {
    expect(lerCoordenadas('-23.55, -46.63')).toEqual({ lat: -23.55, lng: -46.63 })
    expect(lerCoordenadas('-23,55; -46,63')).toEqual({ lat: -23.55, lng: -46.63 })
    expect(lerCoordenadas('-23.55 -46.63')).toEqual({ lat: -23.55, lng: -46.63 })
    expect(lerCoordenadas('Praça da Sé')).toBeNull()
    expect(lerCoordenadas('95, 10')).toBeNull()
  })

  test('distância, tempo e resumo', () => {
    expect(formatarDistancia(850)).toBe('850 m')
    expect(formatarDistancia(12_345)).toBe('12,3 km')
    expect(formatarTempoTrajeto(30)).toBe('1 min')
    expect(formatarTempoTrajeto(5400)).toBe('1 h 30 min')
    expect(Math.round(distanciaReta({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) / 1000)).toBe(111)
    const trajeto = { pontos: [{ lat: 0, lng: 0, nome: 'Casa' }, { lat: 0, lng: 1, nome: 'Trabalho' }], distancia: 12_345, duracao: 1080 }
    expect(resumoLocalizacao(trajeto)).toBe('Casa → Trabalho · 12,3 km')
    expect(descricaoTrajeto(trajeto)).toBe('Trajeto · 12,3 km · 18 min de carro')
    expect(descricaoTrajeto({ ...trajeto, duracao: undefined })).toBe('Trajeto · 12,3 km em linha reta')
    expect(resumoLocalizacao({ pontos: [{ lat: -23.5, lng: -46.6 }] })).toBe('-23.50000, -46.60000')
  })

  test('link do Google Maps: ponto ou trajeto de carro', () => {
    expect(linkMapa({ pontos: [{ lat: 1, lng: 2 }] })).toBe('https://www.google.com/maps/search/?api=1&query=1%2C2')
    expect(linkMapa({ pontos: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }] })).toBe('https://www.google.com/maps/dir/?api=1&origin=1%2C2&destination=3%2C4&travelmode=driving')
  })
})
