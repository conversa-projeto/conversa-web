import { readonly, ref } from 'vue'

// Câmera do "+": no celular (ou só toque) abre a câmera do sistema pelo
// <input capture>; no computador, só com alguma webcam ligada. A lista de
// dispositivos vem sem nomes antes da permissão, mas já diz se há câmera.
const celular = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
  || window.matchMedia('(hover: none) and (pointer: coarse)').matches
const temWebcam = ref(false)
let observando = false

async function conferirWebcam() {
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices()
    temWebcam.value = dispositivos.some((dispositivo) => dispositivo.kind === 'videoinput')
  } catch {
    temWebcam.value = false
  }
}

export function useCamera() {
  if (!observando && !celular && navigator.mediaDevices) {
    observando = true
    void conferirWebcam()
    navigator.mediaDevices.addEventListener('devicechange', () => void conferirWebcam())
  }
  return { celular, temWebcam: readonly(temWebcam) }
}
