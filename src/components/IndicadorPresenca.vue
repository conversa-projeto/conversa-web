<template>
  <span
    v-if="estado !== 'offline' || comOffline"
    :class="COR[estado]"
    :title="titulo ?? TITULO[estado]"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'
import type { EstadoPresenca } from '../types/api'

// Bolinha do status: verde ativo, amarela ausente; offline só aparece (cinza)
// com comOffline. Posição, tamanho e borda vêm de quem usa (class)
const props = defineProps<{
  usuarioId: number
  comOffline?: boolean
  titulo?: string
}>()

const COR: Record<EstadoPresenca, string> = { ativo: 'bg-success-500', ausente: 'bg-warning-500', offline: 'bg-surface-400' }
const TITULO: Record<EstadoPresenca, string> = { ativo: 'Ativo', ausente: 'Ausente', offline: 'Offline' }

const chat = useChatStore()
const estado = computed(() => chat.presencaDe(props.usuarioId).estado)
</script>
