<template>
  <div class="flex h-full flex-col overflow-hidden bg-surface-base">
    <!-- Header -->
    <div class="shrink-0 border-b border-surface-300 px-4 py-3">
      <h2 class="text-lg font-semibold text-surface-800">Chamadas</h2>
      <div class="mt-2 flex gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="filtro === 'todas' ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'"
          @click="filtro = 'todas'"
        >Todas</button>
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="filtro === 'perdidas' ? 'bg-danger-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'"
          @click="filtro = 'perdidas'"
        >Perdidas</button>
      </div>
    </div>

    <!-- Lista -->
    <div v-if="carregando" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-surface-500">Carregando...</span>
    </div>

    <div v-else-if="chamadasFiltradas.length === 0" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-surface-500">{{ filtro === 'perdidas' ? 'Nenhuma chamada perdida' : 'Nenhuma chamada' }}</span>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <template v-for="(grupo, idx) in chamadasAgrupadas" :key="idx">
        <div class="sticky top-0 z-10 bg-surface-100 px-4 py-1.5 text-xs font-medium text-surface-500">
          {{ grupo.label }}
        </div>
        <div
          v-for="chamada in grupo.chamadas"
          :key="chamada.id"
          class="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-surface-100"
          @click="abrirConversa(chamada)"
        >
          <!-- Avatar -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-sm font-semibold text-surface-700">
            <img v-if="avatarOutro(chamada)" :src="avatarOutro(chamada)!" alt="" class="h-full w-full object-cover" />
            <span v-else>{{ inicialOutro(chamada) }}</span>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <!-- Seta efetuada/recebida -->
              <svg v-if="ehEfetuada(chamada)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5 shrink-0" :class="corStatus(chamada)">
                <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5 shrink-0" :class="corStatus(chamada)">
                <path fill-rule="evenodd" d="M14.78 5.22a.75.75 0 0 0-1.06 0L6.5 12.44V6.75a.75.75 0 0 0-1.5 0v7.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 0-1.5H7.56l7.22-7.22a.75.75 0 0 0 0-1.06Z" clip-rule="evenodd" />
              </svg>
              <span class="truncate text-sm font-medium" :class="chamada.status === 5 ? 'text-danger-600' : 'text-surface-800'">
                {{ nomeOutro(chamada) }}
              </span>
              <span class="ml-auto shrink-0 text-xs text-surface-400">{{ formatarHoraChamada(chamada.criado_em) }}</span>
            </div>
            <div class="mt-0.5 text-xs text-surface-500">
              {{ chamada.tipo === 2 ? 'Video' : 'Audio' }}
              <template v-if="chamada.duracao != null"> · {{ formatarDuracaoChamada(chamada.duracao) }}</template>
              <template v-else> · {{ textoStatus(chamada.status) }}</template>
            </div>
          </div>

          <!-- Botao religar -->
          <button
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-500 opacity-0 transition hover:bg-primary-50 group-hover:opacity-100"
            title="Ligar novamente"
            @click.stop="religar(chamada)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
            </svg>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ChamadaHistoricoItem } from '../types/api'
import { TipoChamada } from '../types/api'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'
import { formatarDuracao } from '../utils/formatters'

const emit = defineEmits<{
  'open-conversa': [conversaId: number]
}>()

const auth = useAuthStore()
const chat = useChatStore()
const call = useCallStore()

const chamadas = ref<ChamadaHistoricoItem[]>([])
const carregando = ref(false)
const filtro = ref<'todas' | 'perdidas'>('todas')

onMounted(async () => {
  carregando.value = true
  try {
    chamadas.value = await api.getChamadas()
  } catch { /* silently fail */ }
  carregando.value = false
})

const chamadasFiltradas = computed(() => {
  if (filtro.value === 'perdidas') return chamadas.value.filter(c => c.status === 5)
  return chamadas.value
})

const chamadasAgrupadas = computed(() => {
  const grupos: Array<{ label: string; chamadas: ChamadaHistoricoItem[] }> = []
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  for (const chamada of chamadasFiltradas.value) {
    const data = new Date(chamada.criado_em)
    let label: string
    if (data.toDateString() === hoje.toDateString()) label = 'Hoje'
    else if (data.toDateString() === ontem.toDateString()) label = 'Ontem'
    else label = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.label === label) {
      ultimo.chamadas.push(chamada)
    } else {
      grupos.push({ label, chamadas: [chamada] })
    }
  }
  return grupos
})

function outroParticipante(chamada: ChamadaHistoricoItem) {
  return chamada.participantes.find(p => p.usuario_id !== auth.user?.id) ?? chamada.participantes[0]
}

function nomeOutro(chamada: ChamadaHistoricoItem): string {
  if (chamada.participantes.length > 2) return `Grupo (${chamada.participantes.length})`
  return outroParticipante(chamada)?.nome || 'Desconhecido'
}

function inicialOutro(chamada: ChamadaHistoricoItem): string {
  const nome = outroParticipante(chamada)?.nome || 'D'
  return nome.charAt(0).toUpperCase()
}

function avatarOutro(chamada: ChamadaHistoricoItem): string | null {
  const outro = outroParticipante(chamada)
  return outro?.avatar_url || null
}

function ehEfetuada(chamada: ChamadaHistoricoItem): boolean {
  return chamada.criado_por === auth.user?.id
}

function corStatus(chamada: ChamadaHistoricoItem): string {
  if (chamada.status === 5) return 'text-danger-500'
  if (chamada.status === 2) return 'text-danger-500'
  if (chamada.status === 6) return 'text-surface-400'
  return 'text-success-500'
}

function textoStatus(status: number): string {
  switch (status) {
    case 2: return 'Recusada'
    case 5: return 'Perdida'
    case 6: return 'Cancelada'
    default: return ''
  }
}

function formatarHoraChamada(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarDuracaoChamada(segundos: number): string {
  return formatarDuracao(segundos)
}

function abrirConversa(chamada: ChamadaHistoricoItem) {
  if (chamada.conversa_id) emit('open-conversa', chamada.conversa_id)
}

function religar(chamada: ChamadaHistoricoItem) {
  const tipo = chamada.tipo === 2 ? TipoChamada.Video : TipoChamada.Audio
  const usuarios = chamada.participantes.map(p => ({ id: p.usuario_id }))
  call.iniciarChamada(tipo, usuarios)
}
</script>
