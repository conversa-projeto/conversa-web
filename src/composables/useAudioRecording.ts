import { ref, onUnmounted, type Ref } from 'vue'

export function useAudioRecording(
  erro: Ref<string>,
  onReady: (blob: Blob, nome: string, mime: string) => void
) {
  const gravandoAudio = ref(false)
  let mediaRecorder: MediaRecorder | null = null
  let audioStream: MediaStream | null = null
  let audioChunks: BlobPart[] = []

  function encerrarStreamAudio() {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
    }
    audioStream = null
    mediaRecorder = null
    gravandoAudio.value = false
  }

  async function iniciarAudio() {
    if (gravandoAudio.value) return

    if (!window.isSecureContext) {
      erro.value = 'Para gravar \u00e1udio por navegador, use HTTPS (ou localhost).'
      return
    }

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      erro.value = 'Grava\u00e7\u00e3o de \u00e1udio n\u00e3o suportada neste navegador.'
      return
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(audioStream)
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
      mediaRecorder = recorder
      gravandoAudio.value = true
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'N\u00e3o foi poss\u00edvel iniciar a grava\u00e7\u00e3o'
      encerrarStreamAudio()
    }
  }

  function pararAudio() {
    if (!gravandoAudio.value) return
    gravandoAudio.value = false
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }

  onUnmounted(() => {
    encerrarStreamAudio()
  })

  return {
    gravandoAudio,
    iniciarAudio,
    pararAudio,
    encerrarStreamAudio
  }
}
