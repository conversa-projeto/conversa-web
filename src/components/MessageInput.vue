<template>
  <div v-if="chat.conversaAtiva" class="border-t border-slate-200 bg-white p-3">
    <input ref="inputArquivo" type="file" class="hidden" multiple @change="selecionarArquivo" accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />

    <div class="mx-auto w-full max-w-[1200px]">
      <p v-if="erro" class="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>
      <div class="flex items-end gap-2">
        <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Anexar arquivo" @click="inputArquivo?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
          <span class="hidden md:inline">Arquivo</span>
        </button>

        <div class="relative">
          <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Emoji" @click="mostrarEmoji = !mostrarEmoji; mostrarLinguagens = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
            <span class="hidden md:inline">Emoji</span>
          </button>
          <div v-if="mostrarEmoji" class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 grid min-w-[240px] grid-cols-6 gap-1 rounded border border-slate-200 bg-white p-2 shadow">
            <button
              v-for="emoji in emojis"
              :key="emoji"
              class="rounded px-1 py-1 text-lg hover:bg-slate-100"
              @click="inserirEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <div class="relative">
          <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Código" @click="mostrarLinguagens = !mostrarLinguagens; mostrarEmoji = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
            <span class="hidden md:inline">Código</span>
          </button>
          <div v-if="mostrarLinguagens" class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 max-h-52 overflow-y-auto rounded border border-slate-200 bg-white p-1 shadow">
            <button
              v-for="lang in linguagensDisponiveis"
              :key="lang"
              class="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100"
              @click="inserirCodigo(lang)"
            >
              {{ lang }}
            </button>
          </div>
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

        <div class="flex flex-1 flex-col">
          <div v-if="arquivosFila.length" class="mb-1 flex flex-wrap gap-1.5 rounded-t border border-b-0 border-slate-300 bg-slate-50 px-2 py-1.5">
            <div
              v-for="(arq, idx) in arquivosFila"
              :key="idx"
              class="flex items-center gap-1 rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
            >
              <span class="max-w-[120px] truncate" :title="arq.nome">{{ arq.nome }}</span>
              <button class="ml-0.5 text-slate-400 hover:text-rose-500" @click="removerArquivoFila(idx)" title="Remover">&times;</button>
            </div>
          </div>
          <textarea
            ref="textareaMsg"
            v-model="textoMensagem"
            spellcheck="true"
            rows="1"
            class="w-full max-h-[120px] overflow-y-auto resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            :class="arquivosFila.length ? 'rounded-t-none border-t-0' : ''"
            placeholder="Digite sua mensagem"
            @keydown.enter.exact.prevent="enviarMensagem"
            @paste="aoColarNoChat"
            @input="aoDigitar"
          ></textarea>
        </div>

        <button class="flex items-center gap-1 rounded bg-blue-600 px-2 py-2 text-sm font-medium text-white hover:bg-blue-700 md:px-4" @click="enviarMensagem">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
          <span class="hidden md:inline">Enviar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, shallowRef, watch } from 'vue'
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
const mostrarLinguagens = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)
const erro = ref('')

interface ArquivoNaFila {
  file: File
  nome: string
  tipo: string
  isAudio: boolean
  isImagem: boolean
}
const arquivosFila = shallowRef<ArquivoNaFila[]>([])

const linguagensDisponiveis = [
  'javascript', 'typescript', 'python', 'sql', 'json',
  'html', 'css', 'bash', 'csharp', 'pascal'
]

const emojis = [0x1F600,0x1F601,0x1F602,0x1F923,0x1F60A,0x1F60D,0x1F60E,0x1F622,0x1F621,0x1F44D,0x1F64F,0x2764].map((code) => String.fromCodePoint(code))

const { gravandoAudio, iniciarAudio, pararAudio } = useAudioRecording(erro, () => {
  emit('message-sent')
})

// Limpa erro quando reconectar
watch(() => chat.conectadoTempoReal, (conectado) => {
  if (conectado) erro.value = ''
})

async function enviarMensagem() {
  const texto = textoMensagem.value.trim()
  const temArquivos = arquivosFila.value.length > 0
  if (!texto && !temArquivos) return

  erro.value = ''
  try {
    // Envia texto se houver
    if (texto) {
      await chat.enviarTexto(texto)
      chat.limparDigitandoConversaAtiva()
      textoMensagem.value = ''
      await nextTick()
      if (textareaMsg.value) textareaMsg.value.style.height = 'auto'
    }
    // Envia cada arquivo da fila
    const fila = [...arquivosFila.value]
    arquivosFila.value = []
    for (const arq of fila) {
      await chat.enviarArquivo(arq.file, arq.nome, arq.tipo, arq.isAudio)
    }
    emit('message-sent')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar'
  }
}

function autoResizeTextarea(event: Event) {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function aoDigitar(event: Event) {
  autoResizeTextarea(event)
  if (textoMensagem.value.trim()) {
    chat.enviarDigitando()
  }
}

function inserirEmoji(emoji: string) {
  textoMensagem.value = `${textoMensagem.value}${emoji}`
  mostrarEmoji.value = false
}

function inserirCodigo(linguagem: string) {
  const ta = textareaMsg.value
  if (ta) {
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const texto = textoMensagem.value
    if (start !== end) {
      // Wrap only the selected text
      const antes = texto.slice(0, start)
      const selecao = texto.slice(start, end)
      const depois = texto.slice(end)
      textoMensagem.value = `${antes}\`\`\`${linguagem}\n${selecao}\n\`\`\`${depois}`
    } else if (texto.trim()) {
      // Wrap entire text
      textoMensagem.value = `\`\`\`${linguagem}\n${texto}\n\`\`\``
    } else {
      // Insert empty fence and place cursor inside
      textoMensagem.value = `\`\`\`${linguagem}\n\n\`\`\``
      nextTick(() => {
        if (textareaMsg.value) {
          const pos = linguagem.length + 4 // after ```lang\n
          textareaMsg.value.selectionStart = pos
          textareaMsg.value.selectionEnd = pos
          textareaMsg.value.focus()
        }
      })
    }
  }
  mostrarLinguagens.value = false
  // Trigger auto-resize
  nextTick(() => {
    if (textareaMsg.value) {
      textareaMsg.value.style.height = 'auto'
      textareaMsg.value.style.height = Math.min(textareaMsg.value.scrollHeight, 120) + 'px'
    }
  })
}

function selecionarArquivo(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const novos: ArquivoNaFila[] = []
  for (const file of files) {
    const isImagem = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    if (isImagem) {
      emit('open-image-preview', file, file.name, file.type || 'image/png')
      continue
    }
    novos.push({ file, nome: file.name, tipo: file.type, isAudio, isImagem })
  }
  if (novos.length) {
    arquivosFila.value = [...arquivosFila.value, ...novos]
  }
  target.value = ''
}

function removerArquivoFila(idx: number) {
  arquivosFila.value = arquivosFila.value.filter((_, i) => i !== idx)
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
