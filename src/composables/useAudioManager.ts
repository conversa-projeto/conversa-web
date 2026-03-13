import { ref } from 'vue'

const audioAtual = ref<HTMLAudioElement | null>(null)

export function registrarAudio(el: HTMLAudioElement) {
  if (audioAtual.value && audioAtual.value !== el) {
    audioAtual.value.pause()
  }
  audioAtual.value = el
}

export function desregistrarAudio(el: HTMLAudioElement) {
  if (audioAtual.value === el) {
    audioAtual.value = null
  }
}
