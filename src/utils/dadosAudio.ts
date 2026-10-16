// Duração e intensidade de um áudio, medidas no navegador antes do envio e
// gravadas no servidor (anexo_audio): o player mostra a duração e a onda sem
// baixar o arquivo. A gravação do navegador (WebM em pedaços) não traz a
// duração no arquivo; decodificando, ela sai certa.

export interface DadosAudio {
  /** Segundos */
  duracao: number
  /** Picos de 0 a 100 ao longo do áudio, para desenhar a onda */
  intensidade: number[]
}

export const BARRAS_ONDA = 48

// Acima disso decodificar pesa demais: o áudio vai sem os dados
const TAMANHO_MAXIMO = 30 * 1024 * 1024

export async function medirAudio(blob: Blob): Promise<DadosAudio | null> {
  if (blob.size > TAMANHO_MAXIMO || typeof AudioContext === 'undefined') return null
  const contexto = new AudioContext()
  try {
    const audio = await contexto.decodeAudioData(await blob.arrayBuffer())
    return { duracao: Math.round(audio.duration * 100) / 100, intensidade: picos(audio.getChannelData(0)) }
  } catch {
    return null
  } finally {
    void contexto.close()
  }
}

// O maior valor de cada trecho, relativo ao trecho mais alto do áudio
export function picos(amostras: Float32Array, barras = BARRAS_ONDA): number[] {
  const tamanho = Math.max(1, Math.floor(amostras.length / barras))
  const maximos: number[] = []
  for (let barra = 0; barra < barras; barra++) {
    let maximo = 0
    const fim = Math.min(amostras.length, (barra + 1) * tamanho)
    for (let i = barra * tamanho; i < fim; i++) {
      const valor = Math.abs(amostras[i]!)
      if (valor > maximo) maximo = valor
    }
    maximos.push(maximo)
  }
  const topo = Math.max(...maximos)
  return maximos.map((maximo) => topo > 0 ? Math.round((maximo / topo) * 100) : 0)
}
