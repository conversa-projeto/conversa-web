<template>
  <div
    v-if="contatosFiltrados.length"
    class="absolute bottom-full left-0 z-30 mb-1 w-56 overflow-hidden rounded-xl border border-surface-200 bg-surface-base shadow-xl"
  >
    <button
      v-for="(contato, idx) in contatosFiltrados"
      :key="contato.id"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition"
      :class="idx === ativo ? 'bg-surface-200' : 'hover:bg-surface-100'"
      @mousedown.prevent="emit('selecionar', contato)"
      @mouseenter="ativo = idx"
    >
      <div class="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xs font-semibold text-surface-700">
        {{ inicialNome(contato.nome) }}
        <img v-if="avatarContato(contato)" :src="avatarContato(contato)!" alt="Avatar" class="absolute inset-0 h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      </div>
      <span class="truncate text-surface-800">{{ contato.nome }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import { inicialNome } from '../utils/formatters'
import { TipoConversa } from '../types/api'
import type { Contato } from '../types/api'

const props = defineProps<{ termo: string }>()

const emit = defineEmits<{
  selecionar: [contato: Contato]
  fechar: []
}>()

const chat = useChatStore()
const auth = useAuthStore()
const ativo = ref(0)

const contatosFiltrados = computed(() => {
  const t = props.termo.trim().toLowerCase()
  const lista = t
    ? chat.contatos.filter(c => c.nome.toLowerCase().includes(t) || c.login.toLowerCase().includes(t))
    : chat.contatos
  return lista.slice(0, 6)
})

watch(contatosFiltrados, () => { ativo.value = 0 })

// A lista de contatos nao traz foto: a sua vem do perfil e a dos outros, da
// conversa direta com eles. Sem foto (ou se ela falhar) fica a inicial.
function avatarContato(contato: Contato): string | null {
  if (contato.id === auth.user?.id) return auth.avatarUrl || auth.user.avatar_url || null
  const conversaDireta = chat.conversas.find(
    c => c.tipo === TipoConversa.Direta && c.destinatario_id === contato.id
  )
  return contato.avatar_url || conversaDireta?.avatar_url || null
}

function mover(delta: number) {
  const len = contatosFiltrados.value.length
  if (!len) return
  ativo.value = (ativo.value + delta + len) % len
}

function confirmar() {
  const contato = contatosFiltrados.value[ativo.value]
  if (contato) emit('selecionar', contato)
}

defineExpose({ mover, confirmar })
</script>
