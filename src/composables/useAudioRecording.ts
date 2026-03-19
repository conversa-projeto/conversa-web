import { ref, onUnmounted, type Ref } from 'vue'

export function useAudioRecording(
  erro: Ref<string>,
  onReady: (blob: Blob, nome: string, mime: string) => void
) {
  const gravandoAudio = ref(false)
  const pausado = ref(false)
  let mediaRecorder: MediaRecorder | null = null
  let audioStream: MediaStream | null = null
  let audioChunks: BlobPart[] = []
  let descartado = false
  let mimeType = 'audio/webm'

  function encerrarStreamAudio() {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
    }
    audioStream = null
    mediaRecorder = null
    gravandoAudio.value = false
    pausado.value = false
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
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(audioStream)
      audioChunks = []
      mimeType = recorder.mimeType || 'audio/webm'

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        try {
          if (descartado || !audioChunks.length) {
            descartado = false
            return
          }

          const blob = new Blob(audioChunks, { type: mimeType })
          const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
          const nome = `audio-${Date.now()}.${extension}`

          onReady(blob, nome, mimeType)
        } finally {
          encerrarStreamAudio()
        }
      }

      recorder.start(250) // timeslice para acumular chunks durante gravação
      mediaRecorder = recorder
      descartado = false
      pausado.value = false
      gravandoAudio.value = true
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Não foi possível iniciar a gravação'
      encerrarStreamAudio()
    }
  }

  function pausarAudio() {
    if (!gravandoAudio.value || pausado.value) return
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      pausado.value = true
    }
  }

  function retomarAudio() {
    if (!gravandoAudio.value || !pausado.value) return
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      pausado.value = false
    }
  }

  function obterPreviewBlob(): Blob | null {
    if (!audioChunks.length) return null
    return new Blob(audioChunks, { type: mimeType })
  }

  function pararAudio() {
    if (!gravandoAudio.value) return
    pausado.value = false
    gravandoAudio.value = false
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }

  function descartarAudio() {
    if (!gravandoAudio.value) return
    descartado = true
    pausado.value = false
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
    pausado,
    iniciarAudio,
    pausarAudio,
    retomarAudio,
    obterPreviewBlob,
    pararAudio,
    descartarAudio,
    encerrarStreamAudio
  }
}
