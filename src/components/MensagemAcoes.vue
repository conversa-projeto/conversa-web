<template>
  <div
    class="absolute z-10 mt-[3px] shrink-0 opacity-0 transition pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto"
    :class="[
      menuAberto ? '!opacity-100 !pointer-events-auto' : '',
      isOwn ? 'right-full pr-0.5' : 'left-full pl-0.5',
      'top-0'
    ]"
    ref="containerRef"
  >
    <button
      class="flex h-6 w-6 items-center justify-center rounded-full transition"
      :class="'bg-surface-200/60 hover:bg-surface-300 text-surface-500 hover:text-surface-700 dark:bg-surface-600/60 dark:hover:bg-surface-600 dark:text-surface-400 dark:hover:text-surface-200'"
      @click.stop="toggleMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <div
      v-if="menuAberto && !pickerAberto"
      ref="menuRef"
      class="fixed z-50 min-w-[140px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-600 dark:bg-surface-700"
      :style="menuStyle"
    >
      <!-- Emojis rápidos: linha 1 (4 emojis) -->
      <div class="grid grid-cols-4 gap-0.5 px-2 pt-1.5">
        <button
          v-for="emoji in emojisLinha1"
          :key="emoji"
          class="h-8 w-8 rounded-full text-base transition hover:bg-surface-100 hover:scale-110 dark:hover:bg-surface-600"
          :title="emojiNome(emoji)"
          @click="acaoReagir(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <!-- Emojis rápidos: linha 2 (3 emojis + botão picker) -->
      <div class="grid grid-cols-4 gap-0.5 px-2 pb-1.5 border-b border-surface-200 dark:border-surface-600">
        <button
          v-for="emoji in emojisLinha2"
          :key="emoji"
          class="h-8 w-8 rounded-full text-base transition hover:bg-surface-100 hover:scale-110 dark:hover:bg-surface-600"
          :title="emojiNome(emoji)"
          @click="acaoReagir(emoji)"
        >
          {{ emoji }}
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-600 dark:hover:text-surface-200"
          title="Mais emojis"
          @click.stop="abrirPicker"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.536-4.464a.75.75 0 1 0-1.061-1.061 3.5 3.5 0 0 1-4.95 0 .75.75 0 0 0-1.06 1.06 5 5 0 0 0 7.07 0ZM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5Zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-600"
        @click="acaoResponder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
        </svg>
        Responder
      </button>
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-600"
        @click="acaoEncaminhar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path d="M3.22 10.53a.75.75 0 0 1 .72-.53h8.498l-2.97-2.97a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L12.438 11.5H3.94a.75.75 0 0 1-.72-.97Z" />
        </svg>
        Encaminhar
      </button>
    </div>

    <!-- Emoji Picker popup -->
    <div
      v-if="pickerAberto"
      class="fixed z-50"
      :style="pickerStyle"
    >
      <EmojiPicker
        estatico
        @selecionar="acaoReagirPicker"
        @close="fecharPicker"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, type CSSProperties } from 'vue'
import type { Mensagem } from '../types/api'
import EmojiPicker from './EmojiPicker.vue'
import { emojiNome } from '../utils/emojiNomes'

const props = defineProps<{
  mensagem: Mensagem
  isOwn?: boolean
  menuAberto?: boolean
}>()

const emit = defineEmits<{
  reply: [mensagem: Mensagem]
  forward: [mensagem: Mensagem]
  reagir: [emoji: string]
  'menu-toggle': [aberto: boolean]
}>()

const MENU_LARGURA = 160
const MENU_ALTURA_ESTIMADA = 180
const PICKER_LARGURA = 320
const PICKER_ALTURA = 310
const MARGEM = 8

const emojisLinha1 = ['👍', '❤️', '😂', '😮']
const emojisLinha2 = ['😢', '👏', '🔥']

const menuAberto = ref(false)
const pickerAberto = ref(false)
const containerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()
const menuStyle = ref<CSSProperties>({})
const pickerStyle = ref<CSSProperties>({})

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
      const realHeight = menuRef.value.offsetHeight
      menuStyle.value = calcularPosicao(MENU_LARGURA, realHeight)
    }
  })
}

function toggleMenu() {
  if (menuAberto.value) {
    fecharMenu()
    return
  }
  abrirMenu()
}

function fecharMenu() {
  menuAberto.value = false
  pickerAberto.value = false
  emit('menu-toggle', false)
}

function onFecharMenuGlobal(e: Event) {
  const idOrigem = (e as CustomEvent).detail
  if (menuAberto.value && idOrigem !== props.mensagem.id) {
    fecharMenu()
  }
}

function acaoResponder() {
  fecharMenu()
  emit('reply', props.mensagem)
}

function acaoEncaminhar() {
  fecharMenu()
  emit('forward', props.mensagem)
}

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
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    fecharMenu()
  }
}

function abrirViaContextMenu() {
  abrirMenu()
}

let scrollContainer: HTMLElement | null = null

function onScrollContainer() {
  if (menuAberto.value) {
    fecharMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', fecharMenuExterno)
  document.addEventListener('fechar-menu-acoes', onFecharMenuGlobal)
  scrollContainer = getScrollContainer(containerRef.value ?? null)
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', onScrollContainer, { passive: true })
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', fecharMenuExterno)
  document.removeEventListener('fechar-menu-acoes', onFecharMenuGlobal)
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScrollContainer)
    scrollContainer = null
  }
})

defineExpose({ abrirViaContextMenu })
</script>
