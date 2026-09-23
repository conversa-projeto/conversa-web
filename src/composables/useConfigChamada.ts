import { ref, watch } from 'vue'

// Qualidade das chamadas: o que este navegador envia. Fica no localStorage.
// Os padrões repetem o comportamento de antes desta configuração existir.

export type QualidadeAudio = 'normal' | 'alta' | 'musica'
export type ResolucaoVideo = '360' | '720' | '1080'
export type BandaVideo = 'auto' | 'economico' | 'alto'
export type PrioridadeTela = 'nitidez' | 'fluidez'

export interface ConfigChamada {
  reducaoRuido: boolean
  cancelamentoEco: boolean
  ganhoAutomatico: boolean
  qualidadeAudio: QualidadeAudio
  resolucao: ResolucaoVideo
  fps: number
  bandaVideo: BandaVideo
  prioridadeTela: PrioridadeTela
}

const CHAVE = 'conversa.chamada'

const celular = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)

function padrao(): ConfigChamada {
  return {
    reducaoRuido: true,
    cancelamentoEco: true,
    ganhoAutomatico: true,
    qualidadeAudio: 'normal',
    resolucao: celular ? '360' : '720',
    fps: celular ? 15 : 24,
    bandaVideo: 'auto',
    prioridadeTela: 'nitidez',
  }
}

function ler(): ConfigChamada {
  try {
    return { ...padrao(), ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }
  } catch {
    return padrao()
  }
}

const config = ref<ConfigChamada>(ler())

watch(config, (valor) => localStorage.setItem(CHAVE, JSON.stringify(valor)), { deep: true })

// Bits por segundo de cada opção
export const BITRATE_AUDIO: Record<QualidadeAudio, number> = { normal: 32_000, alta: 64_000, musica: 128_000 }
export const BITRATE_VIDEO: Record<BandaVideo, number | undefined> = { auto: undefined, economico: 500_000, alto: 3_000_000 }
export const DIMENSOES_VIDEO: Record<ResolucaoVideo, { width: number; height: number }> = {
  '360': { width: 640, height: 360 },
  '720': { width: 1280, height: 720 },
  '1080': { width: 1920, height: 1080 },
}

export function useConfigChamada() {
  function restaurarPadrao() {
    config.value = padrao()
  }

  return { config, restaurarPadrao }
}
