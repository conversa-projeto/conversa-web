<template>
  <span class="relative inline-block">
    <button
      class="rounded-sm px-0.5 font-semibold transition-colors"
      :class="isOwn ? 'text-white/90 bg-white/20 hover:bg-white/30' : 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50'"
      @click="abrirChat"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
    >@{{ nome }}</button>
    <div
      v-if="hover && contato"
      class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 flex w-28 -translate-x-1/2 flex-col items-center gap-1 rounded-xl border border-surface-200 bg-surface-base px-3 py-2 shadow-lg"
    >
      <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-lg font-semibold text-surface-700">
        <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
        <span v-else>{{ contato.nome.charAt(0).toUpperCase() }}</span>
      </div>
      <span class="w-full truncate text-center text-xs font-medium text-surface-800">{{ contato.nome }}</span>
      <div class="absolute top-full left-1/2 -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-surface-200 bg-surface-base" />
    </div>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { TipoConversa } from '../types/api'

const props = defineProps<{
  nome: string
  usuarioId: number
  isOwn?: boolean
}>()

const chat = useChatStore()
const hover = ref(false)

const contato = computed(() => chat.contatos.find(c => c.id === props.usuarioId) ?? null)

const avatarUrl = computed(() => {
  const conversaDireta = chat.conversas.find(
    c => c.tipo === TipoConversa.Direta && c.destinatario_id === props.usuarioId
  )
  return contato.value?.avatar_url || conversaDireta?.avatar_url || null
})

function abrirChat() {
  if (contato.value) chat.iniciarConversaDireta(contato.value)
}
</script>
