import { nextTick, ref, type Ref } from 'vue'
import { useChatStore } from '../stores/chat'

export function useAudioRecording(erro: Ref<string>, onSent: () => void) {
  const chat = useChatStore()

  const gravandoAudio = ref(false)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioStream = ref<MediaStream | null>(null)
  let audioChunks: BlobPart[] = []
  let audioInicioGravacao = 0

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
      erro.value = 'Grava\u00E7\u00E3o de \u00E1udio n\u00E3o suportada neste navegador.'
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

      recorder.onstop = async () => {
        const duracaoMs = Date.now() - audioInicioGravacao
        if (!audioChunks.length || duracaoMs < 1000) {
          encerrarStreamAudio()
          if (duracaoMs < 1000) {
            erro.value = '\u00C1udio muito curto, segure por mais tempo.'
            setTimeout(() => { if (erro.value === '\u00C1udio muito curto, segure por mais tempo.') erro.value = '' }, 2000)
          }
          return
        }

        const mime = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunks, { type: mime })
        const extension = mime.includes('ogg') ? 'ogg' : 'webm'
        const nome = `audio-${Date.now()}.${extension}`

        try {
          await chat.enviarArquivo(blob, nome, mime, true)
          await nextTick()
          onSent()
        } catch (e) {
          erro.value = e instanceof Error ? e.message : 'Erro ao enviar \u00E1udio'
        } finally {
          encerrarStreamAudio()
        }
      }

      recorder.start()
      audioInicioGravacao = Date.now()
      mediaRecorder.value = recorder
      gravandoAudio.value = true
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'N\u00E3o foi poss\u00EDvel iniciar a grava\u00E7\u00E3o'
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
