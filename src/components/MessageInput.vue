<template>
  <div v-if="chat.conversaAtiva" ref="raiz" class="relative px-3 pb-2">
    <input
      ref="inputArquivo"
      type="file"
      class="hidden"
      multiple
      @change="selecionarArquivo"
      accept="*/*"
    />

    <div class="relative mx-auto w-full max-w-[850px]">
      <!-- Chip com texto: so aparece quando o usuario esta no fim do chat.
           Fica acima de todo o bloco do campo (resposta, imagens e barra), para
           não ficar por cima da resposta ou das imagens. -->
      <div
        v-if="atividadeVisivel && chatNoFim && !gravandoAudio"
        class="pointer-events-none absolute inset-x-0 z-10 flex pl-3 pr-1"
        style="bottom: calc(100% + 2px)"
      >
        <div class="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-surface-300 px-2 py-1 text-[10px] leading-none text-surface-700 dark:bg-surface-200 dark:text-surface-600">
          <span class="flex gap-0.5">
            <span class="typing-dot" :style="{ animationDelay: '0ms', background: corAtividade }"></span>
            <span class="typing-dot" :style="{ animationDelay: '200ms', background: corAtividade }"></span>
            <span class="typing-dot" :style="{ animationDelay: '400ms', background: corAtividade }"></span>
          </span>
          <span class="truncate">{{ textoAtividade }}</span>
        </div>
      </div>

      <p v-if="erro" class="mb-2 rounded bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

      <!-- Reply preview -->
      <div v-if="chat.mensagemRespondendo" class="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary-500 bg-surface-100 px-3 py-2">
        <div class="min-w-0 flex-1">
          <span class="text-xs font-semibold text-primary-500">{{ chat.tipoReferenciaPendente === TipoMensagemReferencia.Encaminhada ? `Encaminhando de ${chat.mensagemRespondendo.remetente}` : chat.mensagemRespondendo.remetente }}</span>
          <p class="truncate text-xs text-surface-500">{{ resumoMensagem(chat.mensagemRespondendo) }}</p>
        </div>
        <button class="shrink-0 text-surface-400 hover:text-surface-600" @click="chat.cancelarResposta()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <!-- Composer bar -->
      <div class="relative flex items-end gap-2">
        <!-- Linha de digitando/gravando: sempre encostada na borda de cima do campo,
             mesmo com resposta ou anexos pendentes acima dele -->
        <div
          v-if="atividadeVisivel && !gravandoAudio"
          class="indicador-atividade pointer-events-none absolute inset-x-0 bottom-full z-10"
          :class="chat.gravandoNaConversaAtiva.length ? 'indicador-gravando' : 'indicador-digitando'"
        />
        <!-- Normal input bar -->
        <div v-if="!gravandoAudio" class="relative min-w-0 flex-1">
          <div class="flex items-end rounded-3xl border border-surface-500 bg-surface-base pl-3 pr-1 transition-colors focus-within:border-primary-500">
          <!-- Attach button -->
          <div class="relative flex shrink-0 self-end pb-[5.75px]">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 transition hover:bg-surface-200 hover:text-surface-800"
              title="Anexar"
              @click.stop="mostrarAnexo = !mostrarAnexo; mostrarEmoji = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            <AnexoPopup
              v-if="mostrarAnexo"
              :com-votacao="chat.conversaAtiva?.tipo === TipoConversa.Grupo"
              @arquivo="abrirFilePicker()"
              @codigo="mostrarAnexo = false; mostrarCodigo = true"
              @votacao="mostrarAnexo = false; mostrarEnquete = true"
              @close="mostrarAnexo = false"
            />
          </div>

          <!-- Emoji button -->
          <div class="relative flex shrink-0 self-end pb-[5.75px]">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 transition hover:bg-surface-200 hover:text-surface-800"
              title="Emoji"
              @click="mostrarEmoji = !mostrarEmoji; mostrarAnexo = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </button>
            <EmojiPicker
              v-if="mostrarEmoji"
              direcao="cima"
              com-figurinhas
              @selecionar="inserirEmoji"
              @figurinha="escolherFigurinha"
              @close="mostrarEmoji = false"
            />
          </div>

          <!-- Campo rico: texto com imagens, vídeos, áudios, arquivos, figurinhas e
               menções no meio, cada peça apagada pelo Backspace como um caractere -->
          <div class="relative min-w-0 flex-1 py-[11.75px]">
            <span
              v-if="campoVazio"
              aria-hidden="true"
              class="pointer-events-none absolute left-0 top-[11.75px] select-none text-sm leading-5 text-surface-500"
            >Digite uma mensagem</span>
            <div
              ref="campo"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              aria-label="Mensagem"
              spellcheck="true"
              class="relative max-h-[40vh] min-h-[20px] w-full overflow-y-auto whitespace-pre-wrap break-words pr-2 text-sm leading-5 text-surface-800 outline-none"
              @keydown.enter.exact="onEnterCampo"
              @keydown="aoTeclarNoCampo"
              @paste="aoColarNoChat"
              @input="aoDigitar"
              @drop="aoSoltarNoCampo"
              @click="aoClicarNoCampo"
              @blur="guardarCursor"
            ></div>
          </div>

          <!-- Action button: send or mic (inside input bar) -->
          <div class="relative mr-2 flex shrink-0 items-end gap-1 self-end pb-[5.75px]">
            <button
              v-if="temConteudo"
              class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 transition hover:bg-surface-200 hover:text-surface-800"
              title="Agendar mensagem"
              @click="mostrarAgendarModal = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>
            <button
              v-if="temConteudo"
              class="action-btn flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700"
              title="Enviar"
              @click="enviarMensagem()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
            <button
              v-else
              class="action-btn flex h-8 w-8 items-center justify-center rounded-full text-surface-600 transition hover:bg-surface-200 hover:text-surface-800"
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
          <MencaoDropdown
            v-if="mencaoAtiva"
            ref="dropdownRef"
            :termo="mencaoAtiva.texto"
            @selecionar="inserirMencao"
            @fechar="mencaoAtiva = null"
          />
        </div>

        <!-- Recording bar -->
        <BarraGravacao
          v-if="gravandoAudio"
          :pausado="pausado"
          :tempo-formatado="tempoFormatado"
          :reproduzindo-preview="reproduzindoPreview"
          :preview-progresso="previewProgresso"
          @descartar="descartarGravacao"
          @pausar="pausarAudio()"
          @retomar="retomarAudio()"
          @toggle-preview="togglePreviewGravacao"
          @seek="onSeekPreview"
          @enviar="pararEEnviar()"
        />
      </div>
    </div>

    <EnqueteModal
      v-if="mostrarEnquete"
      @close="mostrarEnquete = false"
      @criada="mostrarEnquete = false; emit('message-sent')"
    />

    <!-- Codigo Modal -->
    <CodigoModal
      v-if="mostrarCodigo"
      :codigo-inicial="codigoColado?.codigo"
      :linguagem-inicial="codigoColado?.linguagem"
      @inserir="onInserirCodigo"
      @close="fecharCodigo"
    />

    <!-- Agendar Modal -->
    <AgendarMensagemModal
      :aberta="mostrarAgendarModal"
      @close="mostrarAgendarModal = false"
      @confirmar="enviarAgendada"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue'
import type { Contato } from '../types/api'
import { TipoConversa, TipoMensagemReferencia } from '../types/api'
import { dividirMencoes, extrairMencoesCruas } from '../utils/mencoesTexto'
import { useChatStore, type BlocoMensagem } from '../stores/chat'
import { extensaoPorMime, resumoMensagem } from '../utils/formatters'
import { substituirAtalhoAntesDoCursor, substituirAtalhoNoFim } from '../utils/emojiAtalhos'
import { cercaCodigo, ehDesenhoAscii, pareceCodigo, textoLongo } from '../utils/codeBlocks'
import { detectarLinguagem } from '../composables/useCodeHighlight'
import { useAudioRecording } from '../composables/useAudioRecording'
import { extrairBlocos } from '../utils/blocosEditor'
import { criarAtomoAnexo, criarAtomoFigurinha, criarAtomoMencao, editorVazio, ESPACO_INVISIVEL, liberarPrevias, limparAnexosForaDoCampo, pecaAcimaDoCursor, pecaAoLadoDoCursor, removerLinhaVaziaAntes, removerPeca, semLinhaAntes, abrirLinhaAntes, type AnexoEditor } from '../utils/editorRico'
import AnexoPopup from './AnexoPopup.vue'
const CodigoModal = defineAsyncComponent(() => import('./CodigoModal.vue'))
const AgendarMensagemModal = defineAsyncComponent(() => import('./AgendarMensagemModal.vue'))
import EmojiPicker from './EmojiPicker.vue'
import MencaoDropdown from './MencaoDropdown.vue'
import BarraGravacao from './BarraGravacao.vue'
import EnqueteModal from './EnqueteModal.vue'

const props = withDefaults(defineProps<{
  /** Usuario esta no fim do chat — controla visibilidade do indicador digitando/gravando. */
  chatNoFim?: boolean
}>(), {
  chatNoFim: true
})

const emit = defineEmits<{
  'message-sent': []
  'altura-mudou': [altura: number]
  'open-image-preview': [blob: Blob, nome: string, mime: string]
  'open-fila-image': [url: string, nome: string, identificador: string, galeria: { identificador: string; nome: string; url: string }[]]
}>()

const chat = useChatStore()

// ============================================================================
// Indicador de digitando/gravando acima do input (chip com texto + dots).
// ============================================================================
const chatNoFim = computed(() => props.chatNoFim)

const atividadeVisivel = computed(() =>
  chat.digitandoNaConversaAtiva.length > 0 || chat.gravandoNaConversaAtiva.length > 0
)

const corAtividade = computed(() =>
  chat.gravandoNaConversaAtiva.length ? 'var(--color-danger-500)' : 'var(--color-primary-500)'
)

const textoAtividade = computed(() => {
  const nomes = chat.gravandoNaConversaAtiva.length
    ? chat.gravandoNaConversaAtiva
    : chat.digitandoNaConversaAtiva
  if (nomes.length === 0) return ''
  const gravando = chat.gravandoNaConversaAtiva.length > 0
  const isGrupo = chat.conversaAtiva?.tipo === 2
  const acao = gravando ? 'gravando áudio' : 'digitando'
  const acaoPlural = gravando ? 'estão gravando áudio' : 'estão digitando'
  if (!isGrupo) return `${gravando ? 'Gravando áudio' : 'Digitando'}...`
  if (nomes.length === 1) return `${nomes[0]} está ${acao}...`
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]} ${acaoPlural}...`
  if (nomes.length === 3) return `${nomes[0]}, ${nomes[1]} e ${nomes[2]} ${acaoPlural}...`
  return `${nomes[0]}, ${nomes[1]}, ${nomes[2]} e outras ${nomes.length - 3} pessoas ${acaoPlural}...`
})

const campo = ref<HTMLElement | null>(null)
// Arquivos das peças no campo, pela chave de cada uma (data-anexo)
const anexos = new Map<string, AnexoEditor>()
const campoVazio = ref(true)
const mostrarEmoji = ref(false)
const mostrarAnexo = ref(false)
const mostrarCodigo = ref(false)
const mostrarEnquete = ref(false)
const mostrarAgendarModal = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)
const erro = ref('')
const raiz = ref<HTMLElement | null>(null)

// A lista de mensagens usa a altura deste componente para nada sumir do
// final dela quando ele cresce (resposta, anexos, varias linhas).
let observadorAltura: ResizeObserver | null = null
watch(raiz, (el) => {
  observadorAltura?.disconnect()
  observadorAltura = null
  if (!el) return
  observadorAltura = new ResizeObserver(() => emit('altura-mudou', el.offsetHeight))
  observadorAltura.observe(el)
})

// --- Campo rico ---

function atualizarVazio() {
  campoVazio.value = !campo.value || editorVazio(campo.value)
  if (campo.value) limparAnexosForaDoCampo(campo.value, anexos)
}

// Onde estava o cursor quando o campo perdeu o foco (para o seletor de emoji,
// por exemplo): o que for escolhido entra ali, e não no fim
let cursorGuardado: Range | null = null

function guardarCursor() {
  const selecao = window.getSelection()
  const atual = selecao && selecao.rangeCount ? selecao.getRangeAt(0) : null
  cursorGuardado = atual && campo.value?.contains(atual.commonAncestorContainer) ? atual.cloneRange() : null
}

// Intervalo do cursor dentro do campo; sem foco, onde ele estava (ou o fim)
function intervaloNoCampo(): Range | null {
  const el = campo.value
  if (!el) return null
  const selecao = window.getSelection()
  const atual = selecao && selecao.rangeCount ? selecao.getRangeAt(0) : null
  if (atual && el.contains(atual.commonAncestorContainer)) return atual
  if (cursorGuardado && el.contains(cursorGuardado.commonAncestorContainer)) return cursorGuardado
  const fim = document.createRange()
  fim.selectNodeContents(el)
  fim.collapse(false)
  return fim
}

function posicionarCursorDepois(no: Node) {
  const selecao = window.getSelection()
  const intervalo = document.createRange()
  intervalo.setStartAfter(no)
  intervalo.collapse(true)
  selecao?.removeAllRanges()
  selecao?.addRange(intervalo)
}

// Peça (ou texto) no ponto do cursor; o cursor fica logo depois dela
function inserirNoCursor(no: Node) {
  const intervalo = intervaloNoCampo()
  if (!intervalo) return
  intervalo.deleteContents()
  intervalo.insertNode(no)
  posicionarCursorDepois(no)
  atualizarVazio()
}

// Bloco (imagem, vídeo, áudio, arquivo, figurinha) numa linha própria: o texto
// que estava depois do cursor desce para baixo dele, e o cursor fica na linha
// de baixo para continuar escrevendo
function inserirBloco(no: HTMLElement) {
  const intervalo = intervaloNoCampo()
  if (!intervalo) return
  intervalo.deleteContents()
  const depois = document.createTextNode(ESPACO_INVISIVEL)
  intervalo.insertNode(depois)
  intervalo.insertNode(no)
  const selecao = window.getSelection()
  const cursor = document.createRange()
  cursor.setStart(depois, 1)
  cursor.collapse(true)
  selecao?.removeAllRanges()
  selecao?.addRange(cursor)
  atualizarVazio()
  no.scrollIntoView?.({ block: 'nearest' })
}

// Volta o foco ao campo com o cursor onde estava
function voltarAoCampo() {
  const el = campo.value
  if (!el || document.activeElement === el) return
  const intervalo = intervaloNoCampo()
  el.focus()
  if (!intervalo) return
  const selecao = window.getSelection()
  selecao?.removeAllRanges()
  selecao?.addRange(intervalo)
}

// Texto digitado por código, com desfazer (Ctrl+Z) do próprio navegador
function inserirTexto(texto: string) {
  const el = campo.value
  if (!el) return
  voltarAoCampo()
  document.execCommand('insertText', false, texto)
  atualizarVazio()
}

function inserirAnexo(anexo: AnexoEditor) {
  voltarAoCampo()
  inserirBloco(criarAtomoAnexo(anexos, anexo))
}

function inserirArquivos(arquivos: Iterable<File>) {
  for (const arquivo of arquivos) {
    const mimeType = arquivo.type || 'application/octet-stream'
    inserirAnexo({ blob: arquivo, nomeArquivo: arquivo.name, mimeType, isAudio: mimeType.startsWith('audio/') })
  }
}

function limparCampo() {
  const el = campo.value
  if (!el) return
  liberarPrevias(el)
  el.innerHTML = ''
  anexos.clear()
  mencaoAtiva.value = null
  campoVazio.value = true
}

// --- @mention ---

const mencaoAtiva = ref<{ texto: string; tamanho: number } | null>(null)
const dropdownRef = ref<(ComponentPublicInstance & { mover: (d: number) => void; confirmar: () => void }) | null>(null)

// Texto do trecho em que está o cursor, até o cursor
function textoAntesDoCursor(): { no: Text; posicao: number } | null {
  const selecao = window.getSelection()
  if (!selecao?.rangeCount || !selecao.isCollapsed) return null
  const intervalo = selecao.getRangeAt(0)
  const no = intervalo.startContainer
  if (no.nodeType !== Node.TEXT_NODE || !campo.value?.contains(no)) return null
  return { no: no as Text, posicao: intervalo.startOffset }
}

function detectarMencao(): { texto: string; tamanho: number } | null {
  const trecho = textoAntesDoCursor()
  if (!trecho) return null
  const match = (trecho.no.textContent ?? '').slice(0, trecho.posicao).match(/@([\w\s]*)$/)
  if (!match) return null
  return { texto: match[1] ?? '', tamanho: match[0].length }
}

// "@nome" digitado vira a peça da menção, seguida de um espaço
function inserirMencao(contato: Contato) {
  const trecho = textoAntesDoCursor()
  const ativa = mencaoAtiva.value
  mencaoAtiva.value = null
  if (!trecho || !ativa) return
  const intervalo = document.createRange()
  intervalo.setStart(trecho.no, Math.max(0, trecho.posicao - ativa.tamanho))
  intervalo.setEnd(trecho.no, trecho.posicao)
  intervalo.deleteContents()
  const mencao = criarAtomoMencao(contato.nome, contato.id)
  const espaco = document.createTextNode('\u00a0')
  intervalo.insertNode(espaco)
  intervalo.insertNode(mencao)
  posicionarCursorDepois(espaco)
  campo.value?.focus()
  atualizarVazio()
}

const temConteudo = computed(() => !campoVazio.value || !!chat.mensagemRespondendo)

// --- File picker ---

function abrirFilePicker() {
  mostrarAnexo.value = false
  nextTick(() => inputArquivo.value?.click())
}

// Arquivos soltos na conversa (arrastar e soltar) entram no campo
function adicionarArquivosExternos(files: FileList) {
  inserirArquivos(files)
}

defineExpose({ adicionarArquivosExternos, focarInput: () => focarCampo() })

function selecionarArquivo(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    inserirArquivos(target.files)
  }
  target.value = ''
}

function aoSoltarNoCampo(event: DragEvent) {
  const arquivos = event.dataTransfer?.files
  if (!arquivos?.length) return
  event.preventDefault()
  event.stopPropagation()
  // Solta no ponto em que o mouse está
  const ponto = document.caretRangeFromPoint?.(event.clientX, event.clientY)
  if (ponto && campo.value?.contains(ponto.startContainer)) {
    const selecao = window.getSelection()
    selecao?.removeAllRanges()
    selecao?.addRange(ponto)
  }
  inserirArquivos(arquivos)
}

// Imagem no campo abre no visualizador, com as outras imagens do campo; o "×"
// no canto dela a remove
// Tira a peça do campo e deixa o cursor onde ela estava
function tirarPeca(peca: HTMLElement) {
  const ponto = removerPeca(peca)
  campo.value?.focus()
  const selecao = window.getSelection()
  if (selecao) {
    const intervalo = document.createRange()
    intervalo.setStart(ponto.no, ponto.posicao)
    intervalo.collapse(true)
    selecao.removeAllRanges()
    selecao.addRange(intervalo)
  }
  atualizarVazio()
}

function aoClicarNoCampo(event: MouseEvent) {
  const remover = (event.target as HTMLElement).closest('[data-remover]')
  const peca = remover?.closest<HTMLElement>('[data-anexo]')
  if (peca) {
    event.preventDefault()
    tirarPeca(peca)
    return
  }
  // Clique logo acima de uma peça que abre a linha: cria a linha para escrever ali
  if (campo.value && event.target === campo.value) {
    const peca = [...campo.value.children].find((el): el is HTMLElement =>
      el instanceof HTMLElement && !!(el.dataset.anexo || el.dataset.figurinha) && el.getBoundingClientRect().top > event.clientY)
    if (peca && semLinhaAntes(peca) && peca.getBoundingClientRect().top - event.clientY <= 12) {
      abrirLinhaAntes(peca)
      atualizarVazio()
      return
    }
  }
  const alvo = (event.target as HTMLElement).closest<HTMLElement>('[data-anexo]')
  const img = alvo?.querySelector('img')
  if (!alvo || !img || !campo.value) return
  const galeria = [...campo.value.querySelectorAll<HTMLElement>('[data-anexo]')]
    .filter((el) => el.querySelector('img'))
    .map((el) => ({ identificador: el.dataset.anexo!, nome: el.title, url: el.dataset.url! }))
  emit('open-fila-image', alvo.dataset.url!, alvo.title, alvo.dataset.anexo!, galeria)
}

// --- Code insertion ---

function onInserirCodigo(payload: { linguagem: string; codigo: string }) {
  // Cerca maior que qualquer sequencia de crases do codigo, para um Markdown
  // com exemplos de codigo dentro nao fechar o bloco antes da hora.
  const cerca = cercaCodigo(payload.codigo)
  const bloco = cerca + payload.linguagem + '\n' + payload.codigo + '\n' + cerca
  mostrarCodigo.value = false
  codigoColado.value = null
  limparCampo()
  void enviarBlocos([{ texto: bloco }])
}

// --- Emoji ---

// Emoji entra no ponto do cursor
function inserirEmoji(emoji: string) {
  mostrarEmoji.value = false
  inserirTexto(emoji)
}

// Com o campo vazio, a figurinha vai na hora, sozinha; com algo escrito, entra
// no ponto do cursor e vai junto
function escolherFigurinha(figurinha: string) {
  if (!campoVazio.value) {
    mostrarEmoji.value = false
    voltarAoCampo()
    inserirBloco(criarAtomoFigurinha(figurinha))
    return
  }
  void enviarFigurinha(figurinha)
}

async function enviarFigurinha(figurinha: string) {
  mostrarEmoji.value = false
  erro.value = ''
  try {
    const envio = chat.enviarFigurinha(figurinha)
    await nextTick()
    emit('message-sent')
    await envio
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar a figurinha'
  }
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

// Com o campo vazio, a gravação vai na hora; com algo escrito, entra no campo
// (no ponto do cursor) e vai junto
const { gravandoAudio, pausado, iniciarAudio, pausarAudio, retomarAudio, obterPreviewBlob, pararAudio, descartarAudio } = useAudioRecording(erro, async (blob, nome, mime) => {
  if (!campoVazio.value) {
    await nextTick()
    inserirAnexo({ blob, nomeArquivo: nome, mimeType: mime, isAudio: true, isGravacaoAudio: true })
    return
  }
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
  if (msg) nextTick(() => campo.value?.focus())
})

// Foco no campo, com o cursor no fim
function focarCampo() {
  const el = campo.value
  if (!el) return
  el.focus()
  const fim = document.createRange()
  fim.selectNodeContents(el)
  fim.collapse(false)
  const selecao = window.getSelection()
  selecao?.removeAllRanges()
  selecao?.addRange(fim)
}

async function enviarMensagem(visivelEm: Date | null = null) {
  const el = campo.value
  if (!el) return
  const blocos = extrairBlocos(el, anexos)
  // Atalho de emoji no fim do texto (ex.: ":)" sem espaço depois)
  const ultimo = blocos.at(-1)
  if (ultimo && 'texto' in ultimo) ultimo.texto = substituirAtalhoNoFim(ultimo.texto)
  if (!blocos.length && !chat.mensagemRespondendo) return
  limparCampo()
  cursorGuardado = null
  chat.limparDigitandoConversaAtiva()
  await enviarBlocos(blocos, visivelEm)
}

// Só texto vai como hoje; com peças, os conteúdos vão na ordem do campo
async function enviarBlocos(blocos: BlocoMensagem[], visivelEm: Date | null = null) {
  erro.value = ''
  try {
    const [unico] = blocos
    const envioPromise = blocos.length === 0
      ? chat.enviarMensagemComConteudos('', [], visivelEm)
      : blocos.length === 1 && unico && 'texto' in unico
        ? chat.enviarMensagemComConteudos(unico.texto, [], visivelEm)
        : chat.enviarMensagemComConteudos('', [], visivelEm, null, blocos)

    // Scroll para o final assim que a mensagem otimista é adicionada
    await nextTick()
    emit('message-sent')

    await envioPromise
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar'
  }
}

function enviarAgendada(quando: Date) {
  mostrarAgendarModal.value = false
  void enviarMensagem(quando)
}

function aoDigitar(event: Event) {
  const tipo = (event as InputEvent).inputType
  if (tipo === 'insertText' || tipo === 'insertLineBreak') {
    const trecho = textoAntesDoCursor()
    const troca = trecho && substituirAtalhoAntesDoCursor(trecho.no.textContent ?? '', trecho.posicao)
    if (trecho && troca) {
      trecho.no.textContent = troca.texto
      const selecao = window.getSelection()
      selecao?.collapse(trecho.no, troca.cursor)
    }
  }
  atualizarVazio()
  if (!campoVazio.value) chat.enviarDigitando()
  mencaoAtiva.value = detectarMencao()
}

function onEnterCampo(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  if (mencaoAtiva.value) {
    dropdownRef.value?.confirmar()
  } else {
    void enviarMensagem()
  }
}

const ESPACOS_TAB = '    '

// O cursor está na primeira linha logo abaixo da peça (e não numa linha mais
// abaixo do mesmo texto, que quebrou)
function naPrimeiraLinhaAbaixo(peca: HTMLElement) {
  const cursor = window.getSelection()?.getRangeAt(0).getClientRects()[0]
  return !cursor || cursor.top - peca.getBoundingClientRect().bottom < 24
}

function aoTeclarNoCampo(event: KeyboardEvent) {
  // Backspace/Delete encostado numa peça a apaga como um caractere (o
  // navegador nem sempre apaga um bloco que não se edita)
  if ((event.key === 'Backspace' || event.key === 'Delete') && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && campo.value) {
    if (removerLinhaVaziaAntes(campo.value)) {
      event.preventDefault()
      atualizarVazio()
      return
    }
    const peca = pecaAoLadoDoCursor(campo.value, event.key === 'Backspace' ? 'antes' : 'depois')
    if (peca) {
      event.preventDefault()
      tirarPeca(peca)
      return
    }
  }
  // Seta para cima (ou para a esquerda, no começo) na linha logo abaixo de uma
  // peça que abre o campo: não há linha acima dela, então cria uma
  if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !mencaoAtiva.value && campo.value) {
    const peca = event.key === 'ArrowLeft' ? pecaAoLadoDoCursor(campo.value, 'antes') : pecaAcimaDoCursor(campo.value)
    if (peca && semLinhaAntes(peca) && (event.key === 'ArrowLeft' || naPrimeiraLinhaAbaixo(peca))) {
      event.preventDefault()
      abrirLinhaAntes(peca)
      return
    }
  }
  if (!mencaoAtiva.value) {
    // Tab insere espacos em vez de ir para o proximo botao. Shift+Tab ainda sai do campo.
    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault()
      inserirTexto(ESPACOS_TAB)
    }
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    mencaoAtiva.value = null
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    dropdownRef.value?.mover(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    dropdownRef.value?.mover(-1)
  } else if (event.key === 'Tab') {
    event.preventDefault()
    dropdownRef.value?.confirmar()
  }
}

// Texto colado entra sem a formatação de origem; "@[Nome](id)" (de uma
// mensagem copiada) volta a ser menção
function colarTexto(texto: string) {
  const { texto: limpo, mencoes } = extrairMencoesCruas(texto)
  if (!mencoes.length) {
    inserirTexto(texto)
    return
  }
  for (const trecho of dividirMencoes(limpo, mencoes)) {
    const mencao = trecho.mencao ? mencoes.find((m) => `@${m.nome}` === trecho.texto) : undefined
    if (mencao) inserirNoCursor(criarAtomoMencao(mencao.nome, mencao.id))
    else if (trecho.texto) inserirTexto(trecho.texto)
  }
}

function aoColarNoChat(event: ClipboardEvent) {
  if (!chat.conversaAtivaId) return
  event.preventDefault()

  // Imagens e arquivos colados entram no ponto do cursor
  const arquivos = [...(event.clipboardData?.files ?? [])]
  if (arquivos.length) {
    inserirArquivos(arquivos.map((arquivo) => arquivo.name
      ? arquivo
      : new File([arquivo], `print-${Date.now()}.${extensaoPorMime(arquivo.type || 'image/png')}`, { type: arquivo.type || 'image/png' })))
    return
  }

  const texto = event.clipboardData?.getData('text/plain') || ''
  if (textoLongo(texto)) {
    void sugerirCodigo(texto)
    return
  }
  if (pareceCodigo(texto)) {
    void colarComoCodigo(texto)
    return
  }
  if (texto) colarTexto(texto)
}

// Texto longo colado abre a janela de código já preenchida. Cancelar cola o
// texto como estava: a janela é só uma sugestão.
const codigoColado = ref<{ codigo: string; linguagem: string } | null>(null)

async function sugerirCodigo(texto: string) {
  const codigo = texto.replace(/\n+$/, '')
  // Com blocos ``` dentro, o texto é Markdown (mostrado formatado na mensagem)
  const linguagem = /^`{3}/m.test(codigo)
    ? 'markdown'
    : ehDesenhoAscii(codigo) ? 'texto' : await detectarLinguagem(codigo).catch(() => 'texto')
  codigoColado.value = { codigo, linguagem }
  mostrarCodigo.value = true
}

// Cancelar a janela cola o texto como estava: ela era só uma sugestão
function fecharCodigo() {
  mostrarCodigo.value = false
  const colado = codigoColado.value
  codigoColado.value = null
  if (colado) inserirTexto(colado.codigo)
}

// Código colado vai entre crases, com a linguagem detectada, numa linha própria
async function colarComoCodigo(codigo: string) {
  const intervalo = intervaloNoCampo()?.cloneRange()
  const linguagem = ehDesenhoAscii(codigo) ? 'texto' : await detectarLinguagem(codigo).catch(() => 'texto')
  const cerca = cercaCodigo(codigo)
  const bloco = cerca + linguagem + '\n' + codigo.replace(/\n+$/, '') + '\n' + cerca
  if (intervalo) {
    focarCampo()
    const selecao = window.getSelection()
    selecao?.removeAllRanges()
    selecao?.addRange(intervalo)
  }
  const antes = campoVazio.value ? '' : '\n'
  inserirTexto(antes + bloco + '\n')
}

// Uma letra digitada fora de qualquer campo vai para a mensagem, sem precisar
// clicar nela antes.
function aoTeclarForaDoCampo(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.metaKey) return
  if ((event.ctrlKey || event.altKey) && !event.getModifierState('AltGraph')) return
  if (event.key.length !== 1) return
  const el = campo.value
  if (!el) return
  const ativo = document.activeElement as HTMLElement | null
  if (ativo && ativo !== document.body) {
    if (ativo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(ativo.tagName)) return
    if (event.key === ' ' && ['BUTTON', 'A'].includes(ativo.tagName)) return
  }
  // Com um modal aberto por cima, o campo fica coberto e nao recebe a tecla.
  const r = el.getBoundingClientRect()
  if (!el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))) return
  focarCampo()
}

document.addEventListener('keydown', aoTeclarForaDoCampo)

// --- Cleanup ---

onBeforeUnmount(() => {
  document.removeEventListener('keydown', aoTeclarForaDoCampo)
  observadorAltura?.disconnect()
  document.removeEventListener('pointerup', onGlobalPointerUp)
  document.removeEventListener('pointermove', onMicPointerMove)
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  if (campo.value) liberarPrevias(campo.value)
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

.indicador-atividade {
  height: 14px;
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
}

.indicador-atividade::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  animation: glow-pulse 2s ease-in-out infinite;
}

.indicador-digitando::after {
  background: color-mix(in srgb, var(--color-primary-500) 60%, transparent);
  box-shadow:
    0 0 6px 2px color-mix(in srgb, var(--color-primary-500) 40%, transparent),
    0 0 16px 4px color-mix(in srgb, var(--color-primary-500) 20%, transparent),
    0 0 30px 8px color-mix(in srgb, var(--color-primary-500) 8%, transparent);
}

.indicador-gravando::after {
  background: color-mix(in srgb, var(--color-danger-500) 60%, transparent);
  box-shadow:
    0 0 6px 2px color-mix(in srgb, var(--color-danger-500) 40%, transparent),
    0 0 16px 4px color-mix(in srgb, var(--color-danger-500) 20%, transparent),
    0 0 30px 8px color-mix(in srgb, var(--color-danger-500) 8%, transparent);
}

:root.dark .indicador-digitando::after {
  background: color-mix(in srgb, var(--color-primary-500) 50%, transparent);
  box-shadow:
    0 0 6px 2px color-mix(in srgb, var(--color-primary-500) 35%, transparent),
    0 0 16px 4px color-mix(in srgb, var(--color-primary-500) 15%, transparent),
    0 0 30px 8px color-mix(in srgb, var(--color-primary-500) 6%, transparent);
}

:root.dark .indicador-gravando::after {
  background: color-mix(in srgb, var(--color-danger-500) 50%, transparent);
  box-shadow:
    0 0 6px 2px color-mix(in srgb, var(--color-danger-500) 35%, transparent),
    0 0 16px 4px color-mix(in srgb, var(--color-danger-500) 15%, transparent),
    0 0 30px 8px color-mix(in srgb, var(--color-danger-500) 6%, transparent);
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
