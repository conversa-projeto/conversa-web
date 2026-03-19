<template>
  <div v-if="chat.conversaAtiva" class="border-t border-surface-200 bg-surface-base px-3 py-2 dark:border-surface-700 dark:bg-surface-800">
    <input
      ref="inputArquivo"
      type="file"
      class="hidden"
      multiple
      @change="selecionarArquivo"
      :accept="acceptArquivo"
    />

    <div class="mx-auto w-full max-w-[1200px]">
      <p v-if="erro" class="mb-2 rounded bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

      <!-- File queue preview -->
      <FilaArquivosPreview
        v-if="fila.arquivosFila.value.length"
        :arquivos="fila.arquivosFila.value"
        @alternar-preview="(id) => fila.alternarPreviewAudio(id, (msg) => erro = msg)"
        @remover="fila.removerArquivoFila"
      />

      <!-- Reply preview -->
      <div v-if="chat.mensagemRespondendo" class="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary-500 bg-primary-50 px-3 py-2 dark:bg-primary-900/30">
        <div class="min-w-0 flex-1">
          <span class="text-xs font-semibold text-primary-600 dark:text-primary-400">{{ chat.mensagemRespondendo.remetente }}</span>
          <p class="truncate text-xs text-surface-500 dark:text-surface-400">{{ resumoMensagem(chat.mensagemRespondendo) }}</p>
        </div>
        <button class="shrink-0 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200" @click="chat.cancelarResposta()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <!-- Composer bar -->
      <div class="relative flex items-end gap-2">
        <!-- Normal input bar -->
        <div v-if="!gravandoAudio" class="flex min-w-0 flex-1 items-end rounded-3xl border border-surface-300 bg-surface-100 pl-3 pr-1 dark:border-surface-600 dark:bg-surface-700">
          <!-- Attach button -->
          <div class="relative flex shrink-0 self-end pb-[6px]">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-600 dark:hover:text-surface-200"
              title="Anexar"
              @click.stop="mostrarAnexo = !mostrarAnexo; mostrarEmoji = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            <AnexoPopup
              v-if="mostrarAnexo"
              @documento="abrirFilePicker('documento')"
              @fotos-videos="abrirFilePicker('fotos-videos')"
              @audio="abrirFilePicker('audio')"
              @codigo="mostrarAnexo = false; mostrarCodigo = true"
              @close="mostrarAnexo = false"
            />
          </div>

          <!-- Emoji button -->
          <div class="relative flex shrink-0 self-end pb-[6px]">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-600 dark:hover:text-surface-200"
              title="Emoji"
              @click="mostrarEmoji = !mostrarEmoji; mostrarAnexo = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </button>
            <EmojiPicker
              v-if="mostrarEmoji"
              @selecionar="inserirEmoji"
              @close="mostrarEmoji = false"
            />
          </div>

          <!-- Textarea -->
          <div class="min-w-0 flex-1 pb-[7px] pt-[11px]">
            <textarea
              ref="textareaMsg"
              v-model="textoMensagem"
              spellcheck="true"
              rows="1"
              class="max-h-[120px] w-full resize-none bg-transparent pr-2 text-sm leading-5 text-surface-800 outline-none placeholder:text-surface-400 dark:text-surface-100 dark:placeholder:text-surface-500"
              placeholder="Digite uma mensagem"
              @keydown.enter.exact.prevent="enviarMensagem"
              @paste="aoColarNoChat"
              @input="aoDigitar"
            ></textarea>
          </div>
        </div>

        <!-- Recording bar -->
        <BarraGravacao
          v-else
          :pausado="pausado"
          :tempo-formatado="tempoFormatado"
          :reproduzindo-preview="reproduzindoPreview"
          :preview-progresso="previewProgresso"
          @descartar="descartarGravacao"
          @pausar="pausarAudio()"
          @retomar="retomarAudio()"
          @toggle-preview="togglePreviewGravacao"
          @seek="onSeekPreview"
        />

        <!-- Action button: mic or send -->
        <button
          v-if="gravandoAudio"
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-600 text-white transition hover:bg-success-700"
          title="Enviar áudio"
          @click="pararEEnviar()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
        <button
          v-else-if="temConteudo"
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700"
          title="Enviar"
          @click="enviarMensagem()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
        <button
          v-else
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-600 dark:hover:text-surface-200"
          title="Gravar áudio"
          @pointerdown.prevent="onMicPointerDown"
          @click.prevent
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Codigo Modal -->
    <CodigoModal
      v-if="mostrarCodigo"
      @inserir="onInserirCodigo"
      @close="mostrarCodigo = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { extensaoPorMime, resumoMensagem } from '../utils/formatters'
import { useAudioRecording } from '../composables/useAudioRecording'
import { useFilaArquivos } from '../composables/useFilaArquivos'
import AnexoPopup from './AnexoPopup.vue'
import CodigoModal from './CodigoModal.vue'
import EmojiPicker from './EmojiPicker.vue'
import BarraGravacao from './BarraGravacao.vue'
import FilaArquivosPreview from './FilaArquivosPreview.vue'

const emit = defineEmits<{
  'message-sent': []
  'open-image-preview': [blob: Blob, nome: string, mime: string]
}>()

const chat = useChatStore()
const fila = useFilaArquivos()

const textoMensagem = ref('')
const textareaMsg = ref<HTMLTextAreaElement | null>(null)
const mostrarEmoji = ref(false)
const mostrarAnexo = ref(false)
const mostrarCodigo = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)
const erro = ref('')

const tipoAnexo = ref<'documento' | 'fotos-videos' | 'audio'>('documento')
const acceptMap = {
  'documento': 'application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar',
  'fotos-videos': 'image/*,video/*',
  'audio': 'audio/*'
} as const
const acceptArquivo = computed(() => acceptMap[tipoAnexo.value])
const temConteudo = computed(() => textoMensagem.value.trim().length > 0 || fila.arquivosFila.value.length > 0)

// --- File picker ---

function abrirFilePicker(tipo: 'documento' | 'fotos-videos' | 'audio') {
  tipoAnexo.value = tipo
  mostrarAnexo.value = false
  nextTick(() => inputArquivo.value?.click())
}

function selecionarArquivo(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    fila.adicionarArquivos(target.files)
  }
  target.value = ''
}

// --- Code insertion ---

function onInserirCodigo(payload: { linguagem: string; codigo: string }) {
  const bloco = '```' + payload.linguagem + '\n' + payload.codigo + '\n```'
  mostrarCodigo.value = false
  textoMensagem.value = bloco
  nextTick(() => enviarMensagem())
}

// --- Emoji ---

function inserirEmoji(emoji: string) {
  textoMensagem.value = `${textoMensagem.value}${emoji}`
  mostrarEmoji.value = false
  focarTextarea(textoMensagem.value.length)
}

// --- Audio recording ---

const holdEnviaDireto = ref(false)
const tempoGravacao = ref(0)
let intervaloTempo: ReturnType<typeof setInterval> | null = null

const tempoFormatado = computed(() => {
  const m = Math.floor(tempoGravacao.value / 60)
  const s = tempoGravacao.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const reproduzindoPreview = ref(false)
const previewProgresso = ref(0)
const previewDuracao = ref(0)
let previewPlayer: HTMLAudioElement | null = null
let previewUrl: string | null = null
let previewAnimFrame: number | null = null

function atualizarProgresso() {
  if (previewPlayer && reproduzindoPreview.value) {
    const dur = previewDuracao.value
    if (dur > 0) {
      previewProgresso.value = Math.min((previewPlayer.currentTime / dur) * 100, 100)
    }
    previewAnimFrame = requestAnimationFrame(atualizarProgresso)
  }
}

function limparPreviewGravacao() {
  if (previewAnimFrame) { cancelAnimationFrame(previewAnimFrame); previewAnimFrame = null }
  if (previewPlayer) { previewPlayer.pause(); previewPlayer.src = ''; previewPlayer = null }
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null }
  reproduzindoPreview.value = false
  previewProgresso.value = 0
  previewDuracao.value = 0
}

async function prepararPreview() {
  const blob = obterPreviewBlob()
  if (!blob) return

  if (previewUrl) URL.revokeObjectURL(previewUrl)
  previewUrl = URL.createObjectURL(blob)

  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      const ctx = new AudioCtx()
      try {
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
        previewDuracao.value = buffer.duration
      } finally {
        await ctx.close()
      }
    }
  } catch {
    previewDuracao.value = tempoGravacao.value
  }

  if (previewDuracao.value <= 0) {
    previewDuracao.value = tempoGravacao.value
  }
}

function togglePreviewGravacao() {
  if (reproduzindoPreview.value && previewPlayer) {
    previewPlayer.pause()
    reproduzindoPreview.value = false
    if (previewAnimFrame) { cancelAnimationFrame(previewAnimFrame); previewAnimFrame = null }
    return
  }

  if (!previewUrl) return

  if (previewPlayer) {
    previewPlayer.play().then(() => { reproduzindoPreview.value = true; atualizarProgresso() })
      .catch(() => { erro.value = 'Não foi possível reproduzir o preview' })
    return
  }

  previewPlayer = new Audio(previewUrl)
  previewPlayer.onended = () => {
    reproduzindoPreview.value = false
    previewProgresso.value = 100
    if (previewAnimFrame) { cancelAnimationFrame(previewAnimFrame); previewAnimFrame = null }
  }
  previewPlayer.play().then(() => { reproduzindoPreview.value = true; atualizarProgresso() })
    .catch(() => { erro.value = 'Não foi possível reproduzir o preview'; reproduzindoPreview.value = false })
}

function onSeekPreview(pct: number) {
  previewProgresso.value = pct * 100
  if (previewPlayer && previewDuracao.value > 0) {
    previewPlayer.currentTime = pct * previewDuracao.value
  }
}

const { gravandoAudio, pausado, iniciarAudio, pausarAudio, retomarAudio, obterPreviewBlob, pararAudio, descartarAudio } = useAudioRecording(erro, async (blob, nome, mime) => {
  try {
    await chat.enviarMensagemComConteudos('', [{
      blob, nomeArquivo: nome, mimeType: mime, isAudio: true, isGravacaoAudio: true
    }])
    emit('message-sent')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar áudio'
  }
})

let gravandoInterval: ReturnType<typeof setInterval> | null = null
watch(gravandoAudio, (gravando) => {
  if (gravando) {
    tempoGravacao.value = 0
    intervaloTempo = setInterval(() => tempoGravacao.value++, 1000)
    chat.enviarGravando()
    gravandoInterval = setInterval(() => chat.enviarGravando(), 2500)
  } else {
    if (intervaloTempo) { clearInterval(intervaloTempo); intervaloTempo = null }
    if (gravandoInterval) { clearInterval(gravandoInterval); gravandoInterval = null }
    chat.limparGravandoConversaAtiva()
    holdEnviaDireto.value = false
    limparPreviewGravacao()
  }
})

watch(pausado, (estaPausado) => {
  if (estaPausado) {
    if (intervaloTempo) { clearInterval(intervaloTempo); intervaloTempo = null }
    void prepararPreview()
  } else {
    limparPreviewGravacao()
    if (gravandoAudio.value && !intervaloTempo) {
      intervaloTempo = setInterval(() => tempoGravacao.value++, 1000)
    }
  }
})

// --- Hold-to-send mic logic ---

const HOLD_THRESHOLD_MS = 300
let holdTimer: ReturnType<typeof setTimeout> | null = null
let isHold = false
let micRect: DOMRect | null = null

function onGlobalPointerUp() {
  document.removeEventListener('pointerup', onGlobalPointerUp)
  document.removeEventListener('pointermove', onMicPointerMove)
  micRect = null
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }

  if (!isHold) {
    holdEnviaDireto.value = false
    return
  }

  if (gravandoAudio.value) {
    pararAudio()
  }
}

function onMicPointerMove(e: PointerEvent) {
  if (!micRect) return
  const inside = e.clientX >= micRect.left && e.clientX <= micRect.right
    && e.clientY >= micRect.top && e.clientY <= micRect.bottom
  if (!inside) {
    holdEnviaDireto.value = false
    isHold = false
    micRect = null
    document.removeEventListener('pointermove', onMicPointerMove)
  }
}

function onMicPointerDown(event: PointerEvent) {
  if (gravandoAudio.value) return
  isHold = false
  holdEnviaDireto.value = true
  micRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  document.addEventListener('pointermove', onMicPointerMove)
  holdTimer = setTimeout(() => { isHold = true }, HOLD_THRESHOLD_MS)
  document.addEventListener('pointerup', onGlobalPointerUp, { once: true })
  void iniciarAudio()
}

function descartarGravacao() {
  limparPreviewGravacao()
  descartarAudio()
  tempoGravacao.value = 0
}

function pararEEnviar() {
  pararAudio()
}

// --- Text input ---

watch(() => chat.conectadoTempoReal, (conectado) => {
  if (conectado) erro.value = ''
})

watch(() => chat.mensagemRespondendo, (msg) => {
  if (msg) nextTick(() => textareaMsg.value?.focus())
})

function focarTextarea(posicao?: number) {
  nextTick(() => {
    if (!textareaMsg.value) return
    textareaMsg.value.focus()
    if (typeof posicao === 'number') {
      textareaMsg.value.selectionStart = posicao
      textareaMsg.value.selectionEnd = posicao
    }
  })
}

async function enviarMensagem() {
  const texto = textoMensagem.value.trim()
  const temArquivos = fila.arquivosFila.value.length > 0
  if (!texto && !temArquivos) return

  erro.value = ''
  try {
    const arquivos = [...fila.arquivosFila.value]
    arquivos.forEach((arq) => fila.limparRecursosArquivo(arq))
    fila.arquivosFila.value = []

    await chat.enviarMensagemComConteudos(
      texto,
      arquivos.map((arq) => ({
        blob: arq.file,
        nomeArquivo: arq.nome,
        mimeType: arq.tipo,
        isAudio: arq.isAudio,
        isGravacaoAudio: arq.isGravacaoAudio === true
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

function aoDigitar(event: Event) {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  if (textoMensagem.value.trim()) chat.enviarDigitando()
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

// --- Cleanup ---

onBeforeUnmount(() => {
  document.removeEventListener('pointerup', onGlobalPointerUp)
  document.removeEventListener('pointermove', onMicPointerMove)
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  fila.limparTudo()
})
</script>

<style scoped>
.action-btn {
  animation: action-pop 0.2s ease-out;
}

@keyframes action-pop {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
