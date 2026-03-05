<template>
  <div v-if="chat.conversaAtiva" class="border-t border-slate-200 bg-white p-3">
    <input ref="inputArquivo" type="file" class="hidden" @change="selecionarArquivo" accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />

    <div class="mx-auto w-full max-w-[1200px]">
      <p v-if="erro" class="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>
      <div class="relative flex items-end gap-2">
        <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Anexar arquivo" @click="inputArquivo?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
          <span class="hidden md:inline">Arquivo</span>
        </button>

        <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Emoji" @click="mostrarEmoji = !mostrarEmoji">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
          <span class="hidden md:inline">Emoji</span>
        </button>

        <div v-if="mostrarEmoji" class="absolute bottom-12 left-0 z-10 grid grid-cols-6 gap-1 rounded border border-slate-200 bg-white p-2 shadow">
          <button
            v-for="emoji in emojis"
            :key="emoji"
            class="rounded px-1 py-1 text-lg hover:bg-slate-100"
            @click="inserirEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <button
          class="flex items-center gap-1 rounded px-2 py-2 text-sm font-medium text-white md:px-3"
          :class="gravandoAudio ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'"
          @mousedown.prevent="iniciarAudio"
          @mouseup.prevent="pararAudio"
          @mouseleave.prevent="pararAudio"
          @touchstart.prevent="iniciarAudio"
          @touchend.prevent="pararAudio"
          @touchcancel.prevent="pararAudio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
          <span class="hidden md:inline">{{ gravandoAudio ? 'Gravando...' : '\u00C1udio' }}</span>
        </button>

        <textarea
          ref="textareaMsg"
          v-model="textoMensagem"
          spellcheck="true"
          rows="1"
          class="flex-1 resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Digite sua mensagem"
          @keydown.enter.exact.prevent="enviarTexto"
          @paste="aoColarNoChat"
          @input="autoResizeTextarea"
        ></textarea>

        <button class="flex items-center gap-1 rounded bg-blue-600 px-2 py-2 text-sm font-medium text-white hover:bg-blue-700 md:px-4" @click="enviarTexto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
          <span class="hidden md:inline">Enviar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { extensaoPorMime } from '../utils/formatters'
import { useAudioRecording } from '../composables/useAudioRecording'

const emit = defineEmits<{
  'message-sent': []
  'open-image-preview': [blob: Blob, nome: string, mime: string]
}>()

const chat = useChatStore()

const textoMensagem = ref('')
const textareaMsg = ref<HTMLTextAreaElement | null>(null)
const mostrarEmoji = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)
const erro = ref('')

const emojis = [0x1F600,0x1F601,0x1F602,0x1F923,0x1F60A,0x1F60D,0x1F60E,0x1F622,0x1F621,0x1F44D,0x1F64F,0x2764].map((code) => String.fromCodePoint(code))

const { gravandoAudio, iniciarAudio, pararAudio } = useAudioRecording(erro, () => {
  emit('message-sent')
})

async function enviarTexto() {
  const texto = textoMensagem.value.trim()
  if (!texto) return

  try {
    await chat.enviarTexto(texto)
    textoMensagem.value = ''
    await nextTick()
    if (textareaMsg.value) textareaMsg.value.style.height = 'auto'
    emit('message-sent')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar texto'
  }
}

function autoResizeTextarea(event: Event) {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function inserirEmoji(emoji: string) {
  textoMensagem.value = `${textoMensagem.value}${emoji}`
  mostrarEmoji.value = false
}

async function selecionarArquivo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const isImagem = file.type.startsWith('image/')

  try {
    if (isImagem) {
      emit('open-image-preview', file, file.name, file.type || 'image/png')
      return
    }
    await chat.enviarArquivo(file, file.name, file.type, false)
    await nextTick()
    emit('message-sent')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar arquivo'
  } finally {
    target.value = ''
  }
}

function aoColarNoChat(event: ClipboardEvent) {
  if (!chat.conversaAtivaId) return

  const items = event.clipboardData?.items
  if (!items || items.length === 0) return

  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue

    const arquivo = item.getAsFile()
    if (!arquivo) continue

    event.preventDefault()
    const ext = extensaoPorMime(arquivo.type || 'image/png')
    const nome = `print-${Date.now()}.${ext}`

    emit('open-image-preview', arquivo, nome, arquivo.type || 'image/png')
    return
  }
}
</script>
