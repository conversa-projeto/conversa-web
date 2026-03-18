<template>
  <div
    class="absolute right-[1px] top-[3px] z-10 opacity-0 transition pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto"
    :class="menuAberto ? '!opacity-100 !pointer-events-auto' : ''"
    ref="containerRef"
  >
    <button
      class="flex h-6 w-6 items-center justify-center rounded-full transition"
      :class="isOwn
        ? 'bg-primary-700/60 hover:bg-primary-700 text-white/70 hover:text-white'
        : 'bg-surface-200/60 hover:bg-surface-300 text-surface-500 hover:text-surface-700'"
      @click.stop="toggleMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <div
      v-if="menuAberto"
      class="absolute top-full mt-1 min-w-[140px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-600 dark:bg-surface-700"
      :class="isOwn ? 'right-0' : 'left-0'"
    >
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Mensagem } from '../types/api'

const props = defineProps<{
  mensagem: Mensagem
  isOwn?: boolean
  menuAberto?: boolean
}>()

const emit = defineEmits<{
  reply: [mensagem: Mensagem]
  forward: [mensagem: Mensagem]
  'menu-toggle': [aberto: boolean]
}>()

const menuAberto = ref(false)
const containerRef = ref<HTMLElement>()

function toggleMenu() {
  menuAberto.value = !menuAberto.value
  emit('menu-toggle', menuAberto.value)
}

function fecharMenu() {
  menuAberto.value = false
  emit('menu-toggle', false)
}

function acaoResponder() {
  fecharMenu()
  emit('reply', props.mensagem)
}

function acaoEncaminhar() {
  fecharMenu()
  emit('forward', props.mensagem)
}

function fecharMenuExterno(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    fecharMenu()
  }
}

onMounted(() => document.addEventListener('click', fecharMenuExterno))
onBeforeUnmount(() => document.removeEventListener('click', fecharMenuExterno))
</script>
