import { ref, type Ref } from 'vue'

export function useAudioRecording(
  erro: Ref<string>,
  onReady: (blob: Blob, nome: string, mime: string) => void
) {
  const gravandoAudio = ref(false)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioStream = ref<MediaStream | null>(null)
  let audioChunks: BlobPart[] = []

  function encerrarStreamAudio() {
    if (audioStream.value) {
      audioStream.value.getTracks().forEach((track) => track.stop())
    }
    audioStream.value = null
    mediaRecorder.value = null
    gravandoAudio.value = false
  }

  async function iniciarAudio() {
    if (gravandoAudio.value) return

    if (!window.isSecureContext) {
      erro.value = 'Para gravar áudio por navegador, use HTTPS (ou localhost).'
      return
    }

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      erro.value = 'Gravação de áudio não suportada neste navegador.'
      return
    }

    try {
      audioStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(audioStream.value)
      audioChunks = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        try {
          if (!audioChunks.length) {
            return
          }

          const mime = recorder.mimeType || 'audio/webm'
          const blob = new Blob(audioChunks, { type: mime })
          const extension = mime.includes('ogg') ? 'ogg' : 'webm'
          const nome = `audio-${Date.now()}.${extension}`

          onReady(blob, nome, mime)
        } finally {
          encerrarStreamAudio()
        }
      }

      recorder.start()
      mediaRecorder.value = recorder
      gravandoAudio.value = true
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Não foi possível iniciar a gravação'
      encerrarStreamAudio()
    }
  }

  function pararAudio() {
    if (!gravandoAudio.value) return
    gravandoAudio.value = false
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop()
    }
  }

  return {
    gravandoAudio,
    iniciarAudio,
    pararAudio,
    encerrarStreamAudio
  }
}

