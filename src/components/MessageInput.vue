<template>
  <div v-if="chat.conversaAtiva" class="border-t border-slate-200 bg-white p-3">
    <input
      ref="inputArquivo"
      type="file"
      class="hidden"
      multiple
      @change="selecionarArquivo"
      accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
    />

    <div class="mx-auto w-full max-w-[1200px]">
      <p v-if="erro" class="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>

      <div v-if="arquivosFila.length" class="preview-grid mb-2 flex max-h-48 min-w-0 flex-wrap items-start gap-1 overflow-y-auto rounded border border-slate-300 bg-slate-50 p-2">
        <div
          v-for="arq in arquivosFila"
          :key="arq.id"
          class="preview-card flex min-h-[68px] min-w-0 w-full sm:w-[400px] sm:max-w-[400px] items-center gap-2 rounded border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 shadow-sm sm:px-3"
        >
          <button
            v-if="arq.isAudio"
            class="preview-audio-btn h-8 shrink-0 rounded bg-slate-200 px-2 text-[10px] font-semibold hover:bg-slate-300 sm:px-3 sm:text-[11px]"
            @click="alternarPreviewAudio(arq.id)"
          >
            {{ arq.reproduzindo ? 'Pausar' : 'Ouvir' }}
          </button>

          <div class="preview-content min-w-0 flex-1">
            <div class="preview-name truncate text-sm font-medium text-slate-800" :title="arq.nome">{{ arq.nome }}</div>
            <div class="preview-meta mt-0.5 truncate text-[11px] text-slate-500">
              <span>{{ formatarTamanho(arq.file.size) }}</span>
              <span v-if="arq.isAudio"> - {{ formatarDuracao(arq.duracaoSegundos) }}</span>
            </div>
          </div>

          <button class="preview-remove ml-1 h-7 w-7 shrink-0 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500" @click="removerArquivoFila(arq.id)" title="Remover">&times;</button>
        </div>
      </div>

      <div class="composer-row flex flex-nowrap items-end gap-2">
        <button class="shrink-0 flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Anexar arquivo" @click="inputArquivo?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
          <span class="hidden lg:inline">Arquivo</span>
        </button>

        <div class="relative shrink-0">
          <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Emoji" @click="mostrarEmoji = !mostrarEmoji; mostrarLinguagens = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
            <span class="hidden lg:inline">Emoji</span>
          </button>
          <div v-if="mostrarEmoji" class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 grid min-w-[240px] grid-cols-6 gap-1 rounded border border-slate-200 bg-white p-2 shadow">
            <button v-for="emoji in emojis" :key="emoji" class="rounded px-1 py-1 text-lg hover:bg-slate-100" @click="inserirEmoji(emoji)">
              {{ emoji }}
            </button>
          </div>
        </div>

        <div class="relative shrink-0">
          <button class="flex items-center gap-1 rounded bg-slate-200 px-2 py-2 text-sm hover:bg-slate-300 md:px-3" title="Codigo" @click="mostrarLinguagens = !mostrarLinguagens; mostrarEmoji = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
            <span class="hidden lg:inline">Codigo</span>
          </button>
          <div v-if="mostrarLinguagens" class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 max-h-52 overflow-y-auto rounded border border-slate-200 bg-white p-1 shadow">
            <button v-for="lang in linguagensDisponiveis" :key="lang" class="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100" @click="inserirCodigo(lang)">
              {{ lang }}
            </button>
          </div>
        </div>

        <button
          class="shrink-0 flex items-center gap-1 rounded px-2 py-2 text-sm font-medium text-white md:px-3"
          :class="gravandoAudio ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'"
          @pointerdown.prevent="onAudioPointerDown"
          @pointerup.prevent="onAudioPointerUp"
          @pointerleave.prevent="onAudioPointerLeave"
          @pointercancel.prevent="onAudioPointerCancel"
          @click.prevent="onAudioClick"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
          <span class="hidden lg:inline">{{ gravandoAudio ? 'Gravando...' : 'Audio' }}</span>
        </button>

        <div class="composer-main flex min-w-0 flex-1 flex-col">
          <textarea
            ref="textareaMsg"
            v-model="textoMensagem"
            spellcheck="true"
            rows="1"
            class="w-full max-h-[120px] overflow-y-auto resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Digite sua mensagem"
            @keydown.enter.exact.prevent="enviarMensagem"
            @paste="aoColarNoChat"
            @input="aoDigitar"
          ></textarea>
        </div>

        <button class="composer-send shrink-0 flex items-center gap-1 rounded bg-blue-600 px-2 py-2 text-sm font-medium text-white hover:bg-blue-700 md:px-4" @click="enviarMensagem">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
          <span class="hidden lg:inline">Enviar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { extensaoPorMime, formatarDuracao, formatarTamanho } from '../utils/formatters'
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
  id: string
  file: Blob
  nome: string
  tipo: string
  isAudio: boolean
  previewUrl?: string
  duracaoSegundos?: number | null
  reproduzindo?: boolean
}

const arquivosFila = ref<ArquivoNaFila[]>([])
const playersAudioPreview = new Map<string, HTMLAudioElement>()
let audioPreviewTocandoId: string | null = null

const linguagensDisponiveis = ['texto', 'javascript', 'typescript', 'python', 'sql', 'json', 'html', 'css', 'bash', 'csharp', 'pascal']
const emojis = [0x1F600, 0x1F601, 0x1F602, 0x1F923, 0x1F60A, 0x1F60D, 0x1F60E, 0x1F622, 0x1F621, 0x1F44D, 0x1F64F, 0x2764].map((code) => String.fromCodePoint(code))

function gerarIdArquivo() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `arq-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function atualizarArquivoFila(id: string, patch: Partial<ArquivoNaFila>) {
  arquivosFila.value = arquivosFila.value.map((arq) => (arq.id === id ? { ...arq, ...patch } : arq))
}

function criarArquivoFila(file: Blob, nome: string, tipo: string, isAudio: boolean): ArquivoNaFila {
  const item: ArquivoNaFila = {
    id: gerarIdArquivo(),
    file,
    nome,
    tipo,
    isAudio,
    previewUrl: isAudio ? URL.createObjectURL(file) : undefined,
    duracaoSegundos: isAudio ? null : undefined,
    reproduzindo: false
  }

  if (item.isAudio && item.previewUrl) carregarDuracaoAudio(item.id, item.file, item.previewUrl)
  return item
}

async function obterDuracaoViaDecode(file: Blob): Promise<number | null> {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    const ctx = new AudioCtx()
    try {
      const data = await file.arrayBuffer()
      const decoded = await ctx.decodeAudioData(data.slice(0))
      if (!Number.isFinite(decoded.duration)) return null
      return Math.max(0, Math.round(decoded.duration))
    } finally {
      await ctx.close()
    }
  } catch {
    return null
  }
}

function carregarDuracaoAudio(id: string, file: Blob, previewUrl: string) {
  const audio = new Audio()
  audio.preload = 'metadata'
  let finalizado = false

  const finalizar = async (duracao: number | null) => {
    if (finalizado) return
    finalizado = true
    if (duracao != null) {
      atualizarArquivoFila(id, { duracaoSegundos: duracao })
    } else {
      const viaDecode = await obterDuracaoViaDecode(file)
      atualizarArquivoFila(id, { duracaoSegundos: viaDecode })
    }
    audio.src = ''
  }

  const timeout = setTimeout(() => void finalizar(null), 1200)

  audio.onloadedmetadata = () => {
    clearTimeout(timeout)
    const duracao = Number.isFinite(audio.duration) ? Math.max(0, Math.round(audio.duration)) : null
    void finalizar(duracao)
  }

  audio.ondurationchange = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
    clearTimeout(timeout)
    void finalizar(Math.max(0, Math.round(audio.duration)))
  }

  audio.onerror = () => {
    clearTimeout(timeout)
    void finalizar(null)
  }

  audio.src = previewUrl
  audio.load()
}

function pararPreviewAtual() {
  if (!audioPreviewTocandoId) return
  const audioAtual = playersAudioPreview.get(audioPreviewTocandoId)
  if (audioAtual) {
    audioAtual.pause()
    audioAtual.currentTime = 0
  }
  atualizarArquivoFila(audioPreviewTocandoId, { reproduzindo: false })
  audioPreviewTocandoId = null
}

async function alternarPreviewAudio(id: string) {
  const item = arquivosFila.value.find((arq) => arq.id === id)
  if (!item || !item.isAudio || !item.previewUrl) return

  let player = playersAudioPreview.get(id)
  if (!player) {
    player = new Audio(item.previewUrl)
    player.preload = 'metadata'
    player.onended = () => {
      atualizarArquivoFila(id, { reproduzindo: false })
      if (audioPreviewTocandoId === id) audioPreviewTocandoId = null
    }
    playersAudioPreview.set(id, player)
  }

  if (audioPreviewTocandoId && audioPreviewTocandoId !== id) pararPreviewAtual()

  if (!player.paused && audioPreviewTocandoId === id) {
    player.pause()
    atualizarArquivoFila(id, { reproduzindo: false })
    audioPreviewTocandoId = null
    return
  }

  try {
    await player.play()
    atualizarArquivoFila(id, { reproduzindo: true })
    audioPreviewTocandoId = id
  } catch {
    erro.value = 'Nao foi possivel reproduzir o audio da fila.'
  }
}

function limparRecursosArquivo(arq: ArquivoNaFila) {
  if (arq.previewUrl) URL.revokeObjectURL(arq.previewUrl)
  const player = playersAudioPreview.get(arq.id)
  if (player) {
    player.pause()
    player.src = ''
    playersAudioPreview.delete(arq.id)
  }
  if (audioPreviewTocandoId === arq.id) audioPreviewTocandoId = null
}

const { gravandoAudio, iniciarAudio, pararAudio } = useAudioRecording(erro, (blob, nome, mime) => {
  arquivosFila.value = [...arquivosFila.value, criarArquivoFila(blob, nome, mime, true)]
})

let gravandoInterval: ReturnType<typeof setInterval> | null = null
watch(gravandoAudio, (gravando) => {
  if (gravando) {
    chat.enviarGravando()
    gravandoInterval = setInterval(() => chat.enviarGravando(), 2500)
  } else {
    if (gravandoInterval) { clearInterval(gravandoInterval); gravandoInterval = null }
    chat.limparGravandoConversaAtiva()
  }
})

const AUDIO_HOLD_MS = 350
let audioHoldTimer: ReturnType<typeof setTimeout> | null = null
const audioHoldActive = ref(false)
const ignoreNextAudioClick = ref(false)

watch(() => chat.conectadoTempoReal, (conectado) => {
  if (conectado) erro.value = ''
})

async function enviarMensagem() {
  const texto = textoMensagem.value.trim()
  const temArquivos = arquivosFila.value.length > 0
  if (!texto && !temArquivos) return

  erro.value = ''
  try {
    const fila = [...arquivosFila.value]
    fila.forEach((arq) => limparRecursosArquivo(arq))
    arquivosFila.value = []

    await chat.enviarMensagemComConteudos(
      texto,
      fila.map((arq) => ({
        blob: arq.file,
        nomeArquivo: arq.nome,
        mimeType: arq.tipo,
        isAudio: arq.isAudio
      }))
    )

    if (texto) chat.limparDigitandoConversaAtiva()

    textoMensagem.value = ''
    await nextTick()
    if (textareaMsg.value) textareaMsg.value.style.height = 'auto'
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
  if (textoMensagem.value.trim()) chat.enviarDigitando()
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
      const antes = texto.slice(0, start)
      const selecao = texto.slice(start, end)
      const depois = texto.slice(end)
      textoMensagem.value = `${antes}\`\`\`${linguagem}\n${selecao}\n\`\`\`${depois}`
    } else if (texto.trim()) {
      textoMensagem.value = `\`\`\`${linguagem}\n${texto}\n\`\`\``
    } else {
      textoMensagem.value = `\`\`\`${linguagem}\n\n\`\`\``
      nextTick(() => {
        if (textareaMsg.value) {
          const pos = linguagem.length + 4
          textareaMsg.value.selectionStart = pos
          textareaMsg.value.selectionEnd = pos
          textareaMsg.value.focus()
        }
      })
    }
  }
  mostrarLinguagens.value = false
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
    const isAudio = file.type.startsWith('audio/')
    novos.push(criarArquivoFila(file, file.name, file.type, isAudio))
  }
  if (novos.length) arquivosFila.value = [...arquivosFila.value, ...novos]
  target.value = ''
}

function removerArquivoFila(id: string) {
  const item = arquivosFila.value.find((arq) => arq.id === id)
  if (item) limparRecursosArquivo(item)
  arquivosFila.value = arquivosFila.value.filter((arq) => arq.id !== id)
}

function limparTimerAudio() {
  if (!audioHoldTimer) return
  clearTimeout(audioHoldTimer)
  audioHoldTimer = null
}

function onAudioPointerDown() {
  if (gravandoAudio.value) return
  limparTimerAudio()
  audioHoldTimer = setTimeout(async () => {
    audioHoldActive.value = true
    await iniciarAudio()
  }, AUDIO_HOLD_MS)
}

function onAudioPointerUp() {
  limparTimerAudio()
  if (!audioHoldActive.value) return
  ignoreNextAudioClick.value = true
  audioHoldActive.value = false
  pararAudio()
}

function onAudioPointerLeave() {
  limparTimerAudio()
  if (!audioHoldActive.value) return
  ignoreNextAudioClick.value = true
  audioHoldActive.value = false
  pararAudio()
}

function onAudioPointerCancel() {
  limparTimerAudio()
  if (!audioHoldActive.value) return
  ignoreNextAudioClick.value = true
  audioHoldActive.value = false
  pararAudio()
}

async function onAudioClick() {
  if (ignoreNextAudioClick.value) {
    ignoreNextAudioClick.value = false
    return
  }

  if (gravandoAudio.value) {
    pararAudio()
    return
  }

  await iniciarAudio()
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

onBeforeUnmount(() => {
  pararPreviewAtual()
  arquivosFila.value.forEach((arq) => limparRecursosArquivo(arq))
  playersAudioPreview.clear()
})
</script>

<style scoped>
.preview-card {
  position: relative;
  min-width: 0;
  width: 100%;
  padding-right: 2.25rem;
}

.preview-content {
  min-width: 0;
  width: 100%;
}

.preview-name,
.preview-meta {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-remove {
  position: absolute;
  top: 0.25rem;
  right: 0.2rem;
  margin-left: 0;
}
</style>



