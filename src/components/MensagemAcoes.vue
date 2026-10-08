<template>
  <div
    class="absolute z-10 mt-[3px] shrink-0 opacity-0 transition pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto"
    :class="[
      menuAberto ? '!opacity-100 !pointer-events-auto' : '',
      isOwn ? 'right-full pr-0.5' : 'left-full pl-0.5',
    ]"
    :style="{ top: topOffset + 'px' }"
    ref="containerRef"
  >
    <button
      class="flex h-6 w-6 items-center justify-center rounded-full transition"
      :class="'bg-surface-200/60 hover:bg-surface-300 text-surface-500 hover:text-surface-700'"
      @click.stop="toggleMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Menu e seletor vão para o body: a lista de mensagens isola o empilhamento
         (.chat-pattern), e dentro dela ficavam por trás da caixa de mensagem -->
    <Teleport to="body">
    <div
      v-if="menuAberto && !pickerAberto"
      ref="menuRef"
      class="fixed z-50 min-w-[140px] rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg"
      :style="menuStyle"
    >
      <!-- Emojis rápidos: linha 1 (4 emojis) -->
      <div class="grid grid-cols-4 gap-0.5 px-2 pt-1.5">
        <button
          v-for="emoji in emojisLinha1"
          :key="emoji"
          class="h-8 w-8 rounded-full text-base transition hover:bg-surface-100 hover:scale-110"
          :title="emojiNome(emoji)"
          @click="acaoReagir(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <!-- Emojis rápidos: linha 2 (3 emojis + botão picker) -->
      <div class="grid grid-cols-4 gap-0.5 px-2 pb-1.5 border-b border-surface-200">
        <button
          v-for="emoji in emojisLinha2"
          :key="emoji"
          class="h-8 w-8 rounded-full text-base transition hover:bg-surface-100 hover:scale-110"
          :title="emojiNome(emoji)"
          @click="acaoReagir(emoji)"
        >
          {{ emoji }}
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-600"
          title="Mais emojis"
          @click.stop="abrirPicker"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.536-4.464a.75.75 0 1 0-1.061-1.061 3.5 3.5 0 0 1-4.95 0 .75.75 0 0 0-1.06 1.06 5 5 0 0 0 7.07 0ZM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5Zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
        @click="acaoResponder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
        </svg>
        Responder
      </button>
      <button
        v-if="isGroup && !isOwn"
        class="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
        @click="acaoResponderPrivado"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" clip-rule="evenodd" />
        </svg>
        Responder no privado
      </button>
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
        @click="acaoEncaminhar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
        Encaminhar
      </button>
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
        @click="acaoCopiar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
          <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
        </svg>
        Copiar
      </button>
      <button
        v-if="isOwn && podeExcluir"
        class="flex w-full items-center gap-2 border-t border-surface-200 px-3 py-1.5 text-left text-sm text-danger-600 transition hover:bg-danger-500/10 dark:text-danger-400 dark:hover:bg-danger-500/15"
        @click="acaoExcluir"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
        Ocultar
      </button>
    </div>

    <!-- Ctrl + clique direito: só os emojis de reação, junto do clique -->
    <div
      v-if="reacoesRapidas"
      ref="reacoesRef"
      role="menu"
      aria-label="Reagir"
      class="fixed z-50 flex gap-0.5 rounded-full border border-surface-200 bg-surface-base p-1 shadow-lg"
      :style="reacoesRapidas"
    >
      <button
        v-for="emoji in emojisRapidos"
        :key="emoji"
        type="button"
        role="menuitem"
        class="h-9 w-9 rounded-full text-lg transition hover:scale-110 hover:bg-surface-100"
        :class="{ 'bg-primary-500/20': jaReagi(emoji) }"
        :title="emojiNome(emoji)"
        @click="acaoReagir(emoji)"
      >{{ emoji }}</button>
    </div>

    <!-- Emoji Picker popup -->
    <div
      v-if="pickerAberto"
      ref="pickerRef"
      class="fixed z-50"
      :style="pickerStyle"
    >
      <EmojiPicker
        estatico
        @selecionar="acaoReagirPicker"
        @close="fecharPicker"
      />
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, type CSSProperties } from 'vue'

const BTN_ALTURA = 28 // h-6 (24px) + margem
import type { Mensagem } from '../types/api'
import { TipoConteudo } from '../types/api'
import EmojiPicker from './EmojiPicker.vue'
import { emojiNome } from '../utils/emojiNomes'
import type { AlvoCopia } from '../utils/copiarImagem'

const props = defineProps<{
  mensagem: Mensagem
  isOwn?: boolean
  isGroup?: boolean
  menuAberto?: boolean
}>()

const emit = defineEmits<{
  reply: [mensagem: Mensagem]
  'responder-privado': [mensagem: Mensagem]
  forward: [mensagem: Mensagem]
  copiar: [mensagem: Mensagem, alvo: AlvoCopia]
  reagir: [emoji: string]
  excluir: [mensagem: Mensagem]
  'menu-toggle': [aberto: boolean]
}>()

const MENU_LARGURA = 200
const MENU_ALTURA_ESTIMADA = 180
const PICKER_LARGURA = 320
const PICKER_ALTURA = 310
const MARGEM = 8

const emojisLinha1 = ['👍', '❤️', '😂', '😮']
const emojisLinha2 = ['😢', '👏', '🔥']
const emojisRapidos = [...emojisLinha1, ...emojisLinha2]
// Largura e altura da barra de reações rápidas (7 botões de 36px + espaços)
const REACOES_LARGURA = 7 * 36 + 6 * 2 + 10
const REACOES_ALTURA = 46

const topOffset = ref(0)
const menuAberto = ref(false)
const pickerAberto = ref(false)
const containerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()
const pickerRef = ref<HTMLElement>()
const menuStyle = ref<CSSProperties>({})
const pickerStyle = ref<CSSProperties>({})
const reacoesRef = ref<HTMLElement>()
const reacoesRapidas = ref<CSSProperties | null>(null)

const jaReagi = (emoji: string) => !!props.mensagem.reacoes?.some((r) => r.emoji === emoji && r.reagiu)

function getScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let parent = el?.parentElement
  while (parent) {
    const { overflow, overflowY } = getComputedStyle(parent)
    if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

function calcularPosicao(largura: number, altura: number): CSSProperties {
  if (!containerRef.value) return {}

  const btnRect = containerRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Vertical: preferir abaixo do botão, senão acima
  let top: number
  if (btnRect.bottom + altura + MARGEM <= vh) {
    top = btnRect.bottom + 4
  } else if (btnRect.top - altura - MARGEM >= 0) {
    top = btnRect.top - altura - 4
  } else {
    // Não cabe em nenhum lado, centralizar verticalmente
    top = Math.max(MARGEM, (vh - altura) / 2)
  }

  // Horizontal: alinhar pelo lado do botão, clampando na viewport
  let left: number
  if (props.isOwn) {
    // Alinhar pela direita do botão
    left = btnRect.right - largura
  } else {
    // Alinhar pela esquerda do botão
    left = btnRect.left
  }

  // Clampar para não sair da tela
  if (left + largura > vw - MARGEM) {
    left = vw - largura - MARGEM
  }
  if (left < MARGEM) {
    left = MARGEM
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
  }
}

function abrirMenu() {
  // Fechar qualquer outro menu aberto antes de abrir este
  document.dispatchEvent(new CustomEvent('fechar-menu-acoes', { detail: props.mensagem.id }))

  menuStyle.value = calcularPosicao(MENU_LARGURA, MENU_ALTURA_ESTIMADA)
  menuAberto.value = true
  emit('menu-toggle', true)

  // Recalcular após render com a altura real do menu
  nextTick(() => {
    if (menuRef.value) {
      // Largura real também: com a estimada, na minha mensagem (alinhada pela
      // direita do botão) o menu ficava longe da bolha
      const { offsetWidth, offsetHeight } = menuRef.value
      menuStyle.value = calcularPosicao(offsetWidth || MENU_LARGURA, offsetHeight)
    }
  })
}

function toggleMenu() {
  if (menuAberto.value) {
    fecharMenu()
    return
  }
  alvoCopia = null
  abrirMenu()
}

function fecharMenu() {
  menuAberto.value = false
  pickerAberto.value = false
  reacoesRapidas.value = null
  emit('menu-toggle', false)
}

// Barra só com os emojis, logo acima do ponto do clique (abaixo, se não couber)
function abrirReacoesRapidas(x: number, y: number) {
  document.dispatchEvent(new CustomEvent('fechar-menu-acoes', { detail: props.mensagem.id }))
  menuAberto.value = false
  pickerAberto.value = false
  const left = Math.min(Math.max(MARGEM, x - REACOES_LARGURA / 2), window.innerWidth - REACOES_LARGURA - MARGEM)
  const acima = y - REACOES_ALTURA - MARGEM
  const top = acima >= MARGEM ? acima : Math.min(y + MARGEM, window.innerHeight - REACOES_ALTURA - MARGEM)
  reacoesRapidas.value = { left: `${left}px`, top: `${top}px` }
  emit('menu-toggle', true)
}

function aoTeclarComMenu(e: KeyboardEvent) {
  if (e.key === 'Escape' && (menuAberto.value || reacoesRapidas.value)) fecharMenu()
}

function onFecharMenuGlobal(e: Event) {
  const idOrigem = (e as CustomEvent).detail
  if ((menuAberto.value || reacoesRapidas.value) && idOrigem !== props.mensagem.id) {
    fecharMenu()
  }
}

function acaoResponder() {
  fecharMenu()
  emit('reply', props.mensagem)
}

function acaoResponderPrivado() {
  fecharMenu()
  emit('responder-privado', props.mensagem)
}

function acaoEncaminhar() {
  fecharMenu()
  emit('forward', props.mensagem)
}

function acaoCopiar() {
  fecharMenu()
  emit('copiar', props.mensagem, alvoCopia)
}

function acaoExcluir() {
  fecharMenu()
  emit('excluir', props.mensagem)
}

// "Excluir": o autor exclui a própria mensagem a qualquer momento. Ela
// continua na conversa, marcada como excluída (a agendada que ainda não saiu
// é apagada de vez).
const podeExcluir = computed(() => !props.mensagem.excluida_em)

function acaoReagir(emoji: string) {
  fecharMenu()
  emit('reagir', emoji)
}

function abrirPicker() {
  pickerStyle.value = calcularPosicao(PICKER_LARGURA, PICKER_ALTURA)
  pickerAberto.value = true
}

function fecharPicker() {
  pickerAberto.value = false
}

function acaoReagirPicker(emoji: string) {
  fecharMenu()
  emit('reagir', emoji)
}

function fecharMenuExterno(e: MouseEvent) {
  const alvo = e.target as Node
  const dentro = [containerRef.value, menuRef.value, pickerRef.value, reacoesRef.value].some((el) => el?.contains(alvo))
  if (containerRef.value && !dentro) {
    fecharMenu()
  }
}

// Conteúdo que o "Copiar" copia: o do clique direito, ou a mensagem toda
let alvoCopia: AlvoCopia = null

function abrirViaContextMenu(alvo: AlvoCopia = null) {
  alvoCopia = alvo
  reacoesRapidas.value = null
  abrirMenu()
}

let scrollContainer: HTMLElement | null = null

const OFFSET_EXTRA = 28

function atualizarTopOffset() {
  const parent = containerRef.value?.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  const scrolledOut = Math.max(0, -rect.top)
  const maxOffset = Math.max(0, rect.height - BTN_ALTURA)
  topOffset.value = scrolledOut > 0
    ? Math.min(scrolledOut + OFFSET_EXTRA, maxOffset)
    : 0
}

function onScrollContainer() {
  atualizarTopOffset()
  if (menuAberto.value || reacoesRapidas.value) {
    fecharMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', fecharMenuExterno)
  document.addEventListener('fechar-menu-acoes', onFecharMenuGlobal)
  document.addEventListener('keydown', aoTeclarComMenu)
  scrollContainer = getScrollContainer(containerRef.value ?? null)
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', onScrollContainer, { passive: true })
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', fecharMenuExterno)
  document.removeEventListener('fechar-menu-acoes', onFecharMenuGlobal)
  document.removeEventListener('keydown', aoTeclarComMenu)
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScrollContainer)
    scrollContainer = null
  }
})

defineExpose({ abrirViaContextMenu, abrirReacoesRapidas })
</script>
