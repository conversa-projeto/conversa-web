<template>
  <div
    class="rounded-xl px-3 py-2"
    :class="isOwn ? 'bg-primary-600 text-white' : 'bg-surface-300 dark:bg-surface-200 text-surface-800'"
    style="min-width: 220px; max-width: 320px;"
  >
    <!-- Cabeçalho: icone + tipo -->
    <div class="flex items-center gap-2">
      <!-- Icone chamada -->
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="iconeBg">
        <svg v-if="dados.tipo === 2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4" :class="iconeColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4" :class="iconeColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium">{{ titulo }}</div>
        <div v-if="!ehGrupo && dados.duracao" class="text-xs" :class="subtextoColor">
          {{ mensagem.remetente }} · {{ formatarDuracaoChamada(dados.duracao) }}
        </div>
        <div v-else-if="!ehGrupo" class="text-xs" :class="statusColor">
          {{ mensagem.remetente }} · {{ statusTexto }}
        </div>
      </div>
    </div>

    <!-- Participantes (grupo) -->
    <div v-if="ehGrupo" class="mt-2 space-y-1">
      <div
        v-for="p in dados.participantes"
        :key="p.usuario_id"
        class="flex items-center gap-1.5 text-xs"
      >
        <!-- Status icon -->
        <svg v-if="p.status === 3 || (p.status === 4 && p.duracao)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" :class="isOwn ? 'text-green-300' : 'text-success-500'">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="p.status === 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" :class="isOwn ? 'text-red-300' : 'text-danger-500'">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
        <svg v-else-if="p.status === 5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" :class="isOwn ? 'text-yellow-300' : 'text-warning-500'">
          <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
        <span v-else class="flex h-3.5 w-3.5 items-center justify-center" :class="subtextoColor">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
            <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" />
          </svg>
        </span>
        <span>{{ p.nome }}</span>
        <span v-if="p.duracao != null" :class="subtextoColor">{{ formatarDuracaoChamada(p.duracao) }}</span>
        <span v-else :class="subtextoColor">{{ statusParticipante(p.status) }}</span>
      </div>
    </div>

    <!-- Hora -->
    <div class="mt-1 text-right text-[10px]" :class="subtextoColor">
      {{ formatarHora(mensagem.inserida) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mensagem, ChamadaConteudo } from '../types/api'
import { TipoConteudo } from '../types/api'
import { formatarHora, formatarDuracao } from '../utils/formatters'

const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const dados = computed<ChamadaConteudo>(() => {
  const conteudo = props.mensagem.conteudos.find(c => Number(c.tipo) === TipoConteudo.Chamada)
  if (conteudo) {
    try { return JSON.parse(conteudo.conteudo) } catch { /* fall through */ }
  }
  return { chamada_id: 0, tipo: 1, status: 0, iniciada: null, finalizada: null, duracao: null, participantes: [] }
})

const ehGrupo = computed(() => dados.value.participantes.length > 2)

const titulo = computed(() => {
  const tipo = dados.value.tipo === 2 ? 'video' : 'audio'
  if (ehGrupo.value) return `Chamada de ${tipo} em grupo`
  return `Chamada de ${tipo}`
})

const statusTexto = computed(() => {
  switch (dados.value.status) {
    case 2: return 'Recusada'
    case 5: return 'Perdida'
    case 6: return 'Cancelada'
    default: return ''
  }
})

const subtextoColor = computed(() => props.isOwn ? 'text-white/70' : 'text-surface-500')

const iconeBg = computed(() => {
  if (props.isOwn) {
    if (dados.value.status === 4) return 'bg-white/20'
    if (dados.value.status === 2 || dados.value.status === 5) return 'bg-white/20'
    return 'bg-white/20'
  }
  if (dados.value.status === 4) return 'bg-success-100 dark:bg-success-900/30'
  if (dados.value.status === 2 || dados.value.status === 5) return 'bg-danger-100 dark:bg-danger-900/30'
  return 'bg-surface-200 dark:bg-surface-400'
})

const iconeColor = computed(() => {
  if (props.isOwn) {
    if (dados.value.status === 4) return 'text-green-300'
    if (dados.value.status === 2 || dados.value.status === 5) return 'text-red-300'
    return 'text-white/80'
  }
  if (dados.value.status === 4) return 'text-success-600 dark:text-success-400'
  if (dados.value.status === 2 || dados.value.status === 5) return 'text-danger-600 dark:text-danger-400'
  return 'text-surface-500'
})

const statusColor = computed(() => {
  if (props.isOwn) {
    if (dados.value.status === 2 || dados.value.status === 5) return 'text-red-200'
    return 'text-white/70'
  }
  if (dados.value.status === 2 || dados.value.status === 5) return 'text-danger-500'
  return 'text-surface-500'
})

function formatarDuracaoChamada(segundos: number): string {
  return formatarDuracao(segundos)
}

function statusParticipante(status: number): string {
  switch (status) {
    case 1: return 'Perdida'
    case 2: return 'Recusou'
    case 5: return 'Desconectou'
    default: return ''
  }
}
</script>
