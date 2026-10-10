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

      <!-- A próxima mensagem pede confirmação de leitura -->
      <div v-if="chat.pedirConfirmacao" class="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary-500 bg-surface-100 px-3 py-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 shrink-0 text-primary-600"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        <span class="min-w-0 flex-1 text-xs text-surface-700">A mensagem vai pedir confirmação de leitura</span>
        <button class="shrink-0 text-surface-400 hover:text-surface-600" title="Não pedir confirmação" @click="chat.pedirConfirmacao = false">
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
              @confirmacao="mostrarAnexo = false; chat.pedirConfirmacao = true"
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
            <EditorContent :editor="editor" />
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
            <!-- Campo vazio com mensagens agendadas no chat: o relógio abre a lista -->
            <button
              v-if="!temConteudo && chat.agendadasAtivas.length"
              type="button"
              class="relative flex h-8 w-8 items-center justify-center rounded-full text-primary-600 transition hover:bg-surface-200"
              :title="chat.agendadasAtivas.length === 1 ? '1 mensagem agendada' : `${chat.agendadasAtivas.length} mensagens agendadas`"
              @click="mostrarAgendadas = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white">{{ chat.agendadasAtivas.length }}</span>
            </button>
            <button
              v-if="!temConteudo"
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
            @selecionar="(contato: Contato) => mencaoAtiva?.escolher(contato)"
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

    <MensagensAgendadasModal v-if="mostrarAgendadas" @close="mostrarAgendadas = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, toRaw, watch, type ComponentPublicInstance } from 'vue'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3'
import { Fragment, Slice, type Node as NoDocumento } from '@tiptap/pm/model'
import { EditorState, Selection, TextSelection, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import { Dropcursor, Gapcursor, TrailingNode, UndoRedo } from '@tiptap/extensions'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import type { Contato, Mensagem } from '../types/api'
import { TipoConversa, TipoMensagemReferencia } from '../types/api'
import { dividirMencoes, extrairMencoesCruas } from '../utils/mencoesTexto'
import { useChatStore, type BlocoMensagem } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import { apagarRascunho, chaveRascunho, lerRascunho, salvarRascunho, type Rascunho } from '../services/rascunhos'
import { extensaoPorMime, resumoMensagem } from '../utils/formatters'
import { substituirAtalhoNoFim } from '../utils/emojiAtalhos'
import { cercaCodigo, ehDesenhoAscii, pareceCodigo, textoLongo } from '../utils/codeBlocks'
import { detectarLinguagem } from '../composables/useCodeHighlight'
import { useAudioRecording } from '../composables/useAudioRecording'
import { gifDoHtml } from '../utils/copiarImagem'
import { Anexo, ExtensoesDoCampo, Figurinha, blocosDoDocumento, criarMencao, liberarPrevias, novoIdAnexo, type AnexoEditor } from '../editor/pecas'
import AnexoPopup from './AnexoPopup.vue'
const CodigoModal = defineAsyncComponent(() => import('./CodigoModal.vue'))
const AgendarMensagemModal = defineAsyncComponent(() => import('./AgendarMensagemModal.vue'))
const MensagensAgendadasModal = defineAsyncComponent(() => import('./MensagensAgendadasModal.vue'))
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

// Arquivos das peças no campo, pela chave de cada uma (atributo id da peça)
const anexos = new Map<string, AnexoEditor>()
const campoVazio = ref(true)
const mostrarEmoji = ref(false)
const mostrarAnexo = ref(false)
const mostrarCodigo = ref(false)
const mostrarEnquete = ref(false)
const mostrarAgendarModal = ref(false)
const mostrarAgendadas = ref(false)
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

// --- Campo (editor Tiptap) ---
// Texto com imagens, vídeos, áudios, arquivos, figurinhas e menções no meio
// (editor/pecas.ts). O editor cuida de apagar cada peça como um caractere,
// selecionar, desfazer (Ctrl+Z), mudar a ordem arrastando e pôr o cursor entre
// as peças.

// @nome: a lista de contatos do campo (MencaoDropdown) segue o que é digitado
const mencaoAtiva = ref<{ texto: string; escolher: (contato: Contato) => void } | null>(null)
const dropdownRef = ref<(ComponentPublicInstance & { mover: (d: number) => void; confirmar: () => void }) | null>(null)

function abrirMencao(sugestao: SuggestionProps) {
  mencaoAtiva.value = {
    texto: sugestao.query,
    escolher: (contato) => sugestao.command({ id: String(contato.id), label: contato.nome }),
  }
}

function teclaNaMencao({ event }: SuggestionKeyDownProps) {
  if (!mencaoAtiva.value) return false
  if (event.key === 'Escape') {
    mencaoAtiva.value = null
    return true
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    dropdownRef.value?.mover(event.key === 'ArrowDown' ? 1 : -1)
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    dropdownRef.value?.confirmar()
    return true
  }
  return false
}

const editor = useEditor({
  extensions: [
    Document, Paragraph, Text, HardBreak,
    Gapcursor, Dropcursor.configure({ color: 'var(--color-primary-500)', width: 2 }), TrailingNode, UndoRedo,
    Anexo.configure({ anexos, aoAbrirImagem: abrirImagemDoCampo }),
    Figurinha,
    criarMencao({
      render: () => ({
        onStart: abrirMencao,
        onUpdate: abrirMencao,
        onKeyDown: teclaNaMencao,
        onExit: () => { mencaoAtiva.value = null },
      }),
    }),
    ExtensoesDoCampo.PecasSelecionadas,
    ExtensoesDoCampo.AtalhosEmoji,
    ExtensoesDoCampo.Teclas.configure({ aoEnter: () => { void enviarMensagem(); return true } }),
  ],
  editorProps: {
    attributes: {
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Mensagem',
      spellcheck: 'true',
      // -ml-1/pl-1: o texto fica no mesmo lugar, mas a borda de seleção da peça
      // (que fica por fora dela) cabe à esquerda, sem ser cortada pela rolagem
      class: 'relative -ml-1 max-h-[40vh] min-h-[20px] w-[calc(100%+0.25rem)] overflow-y-auto whitespace-pre-wrap break-words pl-1 pr-2 text-sm leading-5 text-surface-800 outline-none',
    },
    handlePaste: (_view, event) => aoColarNoChat(event),
    // Colado do próprio campo: peça cujo arquivo o campo não tem mais (copiada
    // em outra conversa, por exemplo) fica de fora, em vez de um espaço vazio
    transformPasted: (fatia) => {
      const nos: NoDocumento[] = []
      fatia.content.forEach((no) => { if (no.type.name !== 'anexo' || anexos.has(no.attrs.id)) nos.push(no) })
      return nos.length === fatia.content.childCount ? fatia : new Slice(Fragment.fromArray(nos), fatia.openStart, fatia.openEnd)
    },
    // Peça arrastada dentro do campo muda de lugar (o editor faz); arquivo
    // vindo de fora entra onde foi solto
    handleDrop: (view, event, _fatia, movido) => (movido ? false : aoSoltarNoCampo(view, event)),
  },
  onUpdate: ({ transaction }) => aoMudarCampo(transaction),
})

// Campo sem nada: nem texto (fora espaços), nem peça
function documentoVazio(doc: NoDocumento) {
  let temConteudo = false
  doc.descendants((no) => {
    if (temConteudo) return false
    if (no.isText ? !!no.text?.trim() : no.isAtom && no.type.name !== 'hardBreak') temConteudo = true
    return true
  })
  return !temConteudo
}

function aoMudarCampo(transacao: Transaction) {
  const ed = editor.value
  campoVazio.value = !ed || documentoVazio(ed.state.doc)
  agendarRascunho()
  if (!campoVazio.value && transacao.docChanged && !transacao.getMeta('rascunho')) chat.enviarDigitando()
}

// Volta o cursor ao campo (onde estava; o editor guarda a seleção sem foco)
function focarCampo(posicao: 'end' | null = 'end') {
  editor.value?.commands.focus(posicao)
}

// Peças (e texto) no ponto do cursor, ou na posição dada (arquivo solto). O
// cursor fica na linha logo depois, para continuar escrevendo.
function inserirNoCampo(conteudo: JSONContent[], posicao?: number) {
  const ed = editor.value
  if (!ed || !conteudo.length) return
  const cadeia = ed.chain().focus(null, { scrollIntoView: false })
  const comConteudo = posicao === undefined ? cadeia.insertContent(conteudo) : cadeia.insertContentAt(posicao, conteudo)
  comConteudo.command(({ tr }) => {
    if (conteudo.some((no) => no.type === 'anexo' || no.type === 'figurinha')) {
      // Sem linha depois da peça (ela ficou no fim), uma nova para o cursor
      let proxima = Selection.findFrom(tr.doc.resolve(tr.selection.to), 1, true)
      if (!proxima) {
        const fim = tr.selection.to
        tr.insert(fim, tr.doc.type.schema.nodes.paragraph!.create())
        proxima = TextSelection.create(tr.doc, fim + 1)
      }
      tr.setSelection(proxima)
    }
    return true
  }).scrollIntoView().run()
}

function pecaDeArquivo(anexo: AnexoEditor): JSONContent {
  const id = novoIdAnexo()
  anexo.url = URL.createObjectURL(anexo.blob)
  anexos.set(id, anexo)
  return { type: 'anexo', attrs: { id } }
}

function inserirAnexo(anexo: AnexoEditor) {
  inserirNoCampo([pecaDeArquivo(anexo)])
}

function inserirArquivos(arquivos: Iterable<File>, posicao?: number) {
  inserirNoCampo([...arquivos].map((arquivo) => {
    const mimeType = arquivo.type || 'application/octet-stream'
    return pecaDeArquivo({ blob: arquivo, nomeArquivo: arquivo.name, mimeType, isAudio: mimeType.startsWith('audio/') })
  }), posicao)
}

// Texto no cursor: quebras de linha viram quebras do campo, e "@[Nome](id)"
// (de uma mensagem copiada) volta a ser menção
function trechosDeTexto(texto: string): JSONContent[] {
  const trechos: JSONContent[] = []
  const linhas = (pedaco: string) => pedaco.split('\n').forEach((linha, indice) => {
    if (indice > 0) trechos.push({ type: 'hardBreak' })
    if (linha) trechos.push({ type: 'text', text: linha })
  })
  const { texto: limpo, mencoes } = extrairMencoesCruas(texto)
  if (!mencoes.length) {
    linhas(texto)
    return trechos
  }
  for (const trecho of dividirMencoes(limpo, mencoes)) {
    const mencao = trecho.mencao ? mencoes.find((m) => `@${m.nome}` === trecho.texto) : undefined
    if (mencao) trechos.push({ type: 'mention', attrs: { id: String(mencao.id), label: mencao.nome } })
    else if (trecho.texto) linhas(trecho.texto)
  }
  return trechos
}

function inserirTexto(texto: string) {
  inserirNoCampo(trechosDeTexto(texto))
}

// Imagem do campo aberta no visualizador, junto das outras imagens do campo
function abrirImagemDoCampo(id: string) {
  const ed = editor.value
  const anexo = anexos.get(id)
  if (!ed || !anexo?.url) return
  const galeria: { identificador: string; nome: string; url: string }[] = []
  ed.state.doc.forEach((no) => {
    const item = no.type.name === 'anexo' ? anexos.get(no.attrs.id) : undefined
    if (item?.url && item.mimeType.startsWith('image/')) galeria.push({ identificador: no.attrs.id, nome: item.nomeArquivo, url: item.url })
  })
  emit('open-fila-image', anexo.url, anexo.nomeArquivo, id, galeria)
}

// Estado novo do editor: sem nada para desfazer (o que foi enviado não volta)
function trocarDocumento(conteudo: JSONContent | string | null) {
  const ed = editor.value
  if (!ed) return
  ed.commands.setContent(conteudo ?? '', { emitUpdate: false })
  const { state } = ed
  ed.view.updateState(EditorState.create({ doc: state.doc, plugins: state.plugins, selection: Selection.atEnd(state.doc) }))
}

// Esvazia o campo (ao enviar ou ao trocar de conversa)
function esvaziarCampo() {
  liberarPrevias(anexos)
  anexos.clear()
  trocarDocumento(null)
  mencaoAtiva.value = null
  campoVazio.value = true
}

// Enviada: o rascunho da conversa acabou
function limparCampo() {
  esvaziarCampo()
  cancelarRascunhoAgendado()
  const chave = chaveDoRascunho(conversaDoCampo)
  if (chave) void apagarRascunho(chave).catch(() => { /* sem IndexedDB: nada a apagar */ })
}

// --- Rascunho por conversa ---
// O que está no campo (e o "respondendo a...") fica salvo por usuário e
// conversa: trocar de conversa esvazia o campo, e voltar o traz de volta,
// mesmo depois de fechar o navegador (services/rascunhos.ts, IndexedDB)

const auth = useAuthStore()
// Conversa a que pertence o que está no campo agora
let conversaDoCampo: number | null = null
let rascunhoAgendado: ReturnType<typeof setTimeout> | null = null
let restaurandoRascunho = false

function chaveDoRascunho(conversaId: number | null) {
  const usuarioId = auth.user?.id
  return usuarioId && conversaId ? chaveRascunho(usuarioId, conversaId) : null
}

function cancelarRascunhoAgendado() {
  if (rascunhoAgendado) clearTimeout(rascunhoAgendado)
  rascunhoAgendado = null
}

function copiaDaResposta(mensagem: Mensagem | null): Mensagem | null {
  if (!mensagem) return null
  try {
    return structuredClone(toRaw(mensagem))
  } catch {
    return null
  }
}

function capturarRascunho(): Rascunho | null {
  const ed = editor.value
  const respondendo = chat.mensagemRespondendo
  if ((!ed || documentoVazio(ed.state.doc)) && !respondendo) return null
  const presentes = new Set<string>()
  ed?.state.doc.forEach((no) => { if (no.type.name === 'anexo') presentes.add(no.attrs.id) })
  return {
    documento: ed?.getJSON() ?? null,
    anexos: [...anexos].filter(([id]) => presentes.has(id)).map(([id, anexo]) => ({
      id,
      blob: anexo.blob,
      nomeArquivo: anexo.nomeArquivo,
      mimeType: anexo.mimeType,
      isAudio: anexo.isAudio,
      isGravacaoAudio: anexo.isGravacaoAudio,
    })),
    respondendo: copiaDaResposta(respondendo),
    tipoReferencia: chat.tipoReferenciaPendente,
    atualizadoEm: Date.now(),
  }
}

// Grava já (vazio apaga o rascunho)
function gravarRascunho(conversaId: number | null) {
  const chave = chaveDoRascunho(conversaId)
  if (!chave) return
  const rascunho = capturarRascunho()
  void (rascunho ? salvarRascunho(chave, rascunho) : apagarRascunho(chave)).catch(() => { /* sem IndexedDB (aba anônima, por exemplo): fica sem rascunho */ })
}

// Cada mudança no campo grava um pouco depois, de uma vez
function agendarRascunho() {
  if (restaurandoRascunho) return
  cancelarRascunhoAgendado()
  const conversa = conversaDoCampo
  rascunhoAgendado = setTimeout(() => {
    rascunhoAgendado = null
    if (conversa === conversaDoCampo) gravarRascunho(conversa)
  }, 400)
}

function aplicarRascunho(rascunho: Rascunho) {
  restaurandoRascunho = true
  // Cada peça é refeita do arquivo (as prévias antigas não valem mais), com a
  // mesma chave que o documento usa
  for (const { id, ...anexo } of rascunho.anexos) {
    anexos.set(id, { ...anexo, url: URL.createObjectURL(anexo.blob) })
  }
  // Rascunho do campo antigo vinha em HTML
  trocarDocumento(rascunho.documento ?? rascunho.html ?? null)
  // A resposta escolhida enquanto o rascunho era lido (ex.: "responder no
  // privado") fica no lugar da salva
  if (rascunho.respondendo?.conversa_id === conversaDoCampo && !chat.mensagemRespondendo) {
    chat.mensagemRespondendo = rascunho.respondendo
    chat.tipoReferenciaPendente = rascunho.tipoReferencia
  }
  campoVazio.value = !editor.value || documentoVazio(editor.value.state.doc)
  restaurandoRascunho = false
}

async function restaurarRascunho(conversaId: number) {
  const chave = chaveDoRascunho(conversaId)
  if (!chave) return
  let rascunho: Rascunho | null = null
  try {
    rascunho = await lerRascunho(chave)
  } catch {
    return
  }
  await nextTick()
  // Trocou de conversa ou já começou a escrever enquanto lia: fica como está
  if (!rascunho || conversaDoCampo !== conversaId || !campoVazio.value) return
  aplicarRascunho(rascunho)
}

// Troca de conversa: guarda o rascunho da que sai, esvazia o campo e traz o da
// que entra
watch(() => chat.conversaAtivaId, (nova, antiga) => {
  cancelarRascunhoAgendado()
  if (antiga && conversaDoCampo === antiga) {
    gravarRascunho(antiga)
    esvaziarCampo()
    chat.cancelarResposta()
  }
  conversaDoCampo = nova
  if (nova) void restaurarRascunho(nova)
}, { immediate: true })

// O editor fica pronto depois da montagem: o rascunho lido antes disso entra agora
watch(editor, (ed) => {
  if (ed && conversaDoCampo) void restaurarRascunho(conversaDoCampo)
})

watch(() => chat.mensagemRespondendo, () => agendarRascunho())

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

// Arquivo vindo de fora, solto no campo: entra no ponto em que o mouse está
function aoSoltarNoCampo(view: EditorView, event: DragEvent) {
  const arquivos = event.dataTransfer?.files
  if (!arquivos?.length) return false
  event.preventDefault()
  event.stopPropagation()
  const ponto = view.posAtCoords({ left: event.clientX, top: event.clientY })
  inserirArquivos(arquivos, ponto?.pos)
  return true
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
    inserirNoCampo([{ type: 'figurinha', attrs: { figurinha } }])
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
  if (msg) nextTick(() => focarCampo(null))
})

async function enviarMensagem(visivelEm: Date | null = null) {
  const ed = editor.value
  if (!ed) return
  const blocos = blocosDoDocumento(ed.state.doc, anexos)
  // Atalho de emoji no fim do texto (ex.: ":)" sem espaço depois)
  const ultimo = blocos.at(-1)
  if (ultimo && 'texto' in ultimo) ultimo.texto = substituirAtalhoNoFim(ultimo.texto)
  if (!blocos.length && !chat.mensagemRespondendo) return
  limparCampo()
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

// Colar: imagens e arquivos entram no ponto do cursor; texto longo ou código
// sugerem a janela de código; o resto entra sem a formatação de origem
function aoColarNoChat(event: ClipboardEvent) {
  if (!chat.conversaAtivaId) return false
  // Copiado do próprio campo (imagem, figurinha, menção): o editor cola as
  // peças como elas são
  const html = event.clipboardData?.getData('text/html') ?? ''
  if (html.includes('data-pm-slice') && /data-anexo|data-figurinha|data-type="mention"/.test(html)) return false
  event.preventDefault()

  // Um GIF copiado vem também no HTML: o arquivo (PNG) teria só o primeiro quadro
  const colados = [...(event.clipboardData?.files ?? [])]
  const gif = colados.length === 1 && colados[0]!.type.startsWith('image/') ? gifDoHtml(event.clipboardData?.getData('text/html') ?? '') : null
  const arquivos = gif ? [gif] : colados
  if (arquivos.length) {
    inserirArquivos(arquivos.map((arquivo) => arquivo.name
      ? arquivo
      : new File([arquivo], `print-${Date.now()}.${extensaoPorMime(arquivo.type || 'image/png')}`, { type: arquivo.type || 'image/png' })))
    return true
  }

  const texto = event.clipboardData?.getData('text/plain') || ''
  if (textoLongo(texto)) {
    void sugerirCodigo(texto)
    return true
  }
  if (pareceCodigo(texto)) {
    void colarComoCodigo(texto)
    return true
  }
  if (texto) inserirTexto(texto)
  return true
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
  const linguagem = ehDesenhoAscii(codigo) ? 'texto' : await detectarLinguagem(codigo).catch(() => 'texto')
  const cerca = cercaCodigo(codigo)
  const bloco = cerca + linguagem + '\n' + codigo.replace(/\n+$/, '') + '\n' + cerca
  const antes = campoVazio.value ? '' : '\n'
  inserirTexto(antes + bloco + '\n')
}

// Uma letra digitada fora de qualquer campo vai para a mensagem, sem precisar
// clicar nela antes.
function aoTeclarForaDoCampo(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.metaKey) return
  if ((event.ctrlKey || event.altKey) && !event.getModifierState('AltGraph')) return
  if (event.key.length !== 1) return
  const el = editor.value?.view.dom
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
  // Saindo com mudança ainda por gravar
  if (rascunhoAgendado) {
    cancelarRascunhoAgendado()
    gravarRascunho(conversaDoCampo)
  }
  liberarPrevias(anexos)
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
