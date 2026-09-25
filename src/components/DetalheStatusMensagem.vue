<template>
  <div class="absolute bottom-full right-0 z-30 mb-1 w-60 rounded-lg border border-surface-300 bg-surface-base p-2 text-left text-xs text-surface-700 shadow-lg">
    <p v-if="carregando" class="py-1 text-surface-500">Carregando...</p>
    <p v-else-if="erro" class="py-1 text-surface-500">{{ erro }}</p>

    <!-- Conversa direta: o horário de cada etapa -->
    <ul v-else-if="!isGroup" class="space-y-1">
      <li v-for="etapa in etapasDireta" :key="etapa.titulo" class="flex items-center justify-between gap-3">
        <span class="text-surface-500">{{ etapa.titulo }}</span>
        <span :class="etapa.quando ? 'text-surface-800' : 'text-surface-400'">{{ etapa.quando || 'Aguardando' }}</span>
      </li>
    </ul>

    <!-- Grupo: quem viu, quem só recebeu e quem ainda não recebeu -->
    <div v-else class="max-h-64 space-y-2 overflow-y-auto">
      <div v-for="secao in secoesGrupo" :key="secao.titulo">
        <p class="mb-0.5 font-semibold text-surface-500">{{ secao.titulo }} ({{ secao.itens.length }})</p>
        <ul class="space-y-0.5">
          <li v-for="item in secao.itens" :key="item.usuario_id" class="flex items-center justify-between gap-3">
            <span class="truncate text-surface-800">{{ item.nome }}</span>
            <span v-if="secao.horario(item)" class="shrink-0 text-surface-500">{{ quando(secao.horario(item)) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Mensagem, StatusDestinatario } from '../types/api'
import { getDetalheStatusMensagem } from '../services/conversaApi'

const props = defineProps<{
  mensagem: Mensagem
  isGroup: boolean
}>()

const destinatarios = ref<StatusDestinatario[]>([])
const carregando = ref(true)
const erro = ref('')

// Hoje mostra só a hora; outros dias, dia/mês e hora
function quando(iso: string | null) {
  if (!iso) return ''
  const data = new Date(iso)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (data.toDateString() === new Date().toDateString()) return hora
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
}

const ehAudio = computed(() => props.mensagem.conteudos.some((c) => Number(c.tipo) === 4 || Number(c.tipo) === 5))

const etapasDireta = computed(() => {
  const destino = destinatarios.value[0]
  const etapas = [
    { titulo: 'Enviada', quando: quando(props.mensagem.visivel_em || props.mensagem.inserida) },
    { titulo: 'Recebida', quando: quando(destino?.recebida ?? null) },
    { titulo: 'Visualizada', quando: quando(destino?.visualizada ?? null) },
  ]
  if (ehAudio.value) etapas.push({ titulo: 'Ouvida', quando: quando(destino?.reproduzida ?? null) })
  return etapas
})

const secoesGrupo = computed(() => [
  {
    titulo: 'Visualizada por',
    itens: destinatarios.value.filter((d) => d.visualizada),
    horario: (d: StatusDestinatario) => d.visualizada,
  },
  {
    titulo: 'Recebida por',
    itens: destinatarios.value.filter((d) => d.recebida && !d.visualizada),
    horario: (d: StatusDestinatario) => d.recebida,
  },
  {
    titulo: 'Aguardando',
    itens: destinatarios.value.filter((d) => !d.recebida),
    horario: () => null,
  },
].filter((secao) => secao.itens.length))

onMounted(async () => {
  try {
    destinatarios.value = await getDetalheStatusMensagem(props.mensagem.id)
  } catch {
    erro.value = 'Não foi possível carregar o status.'
  } finally {
    carregando.value = false
  }
})
</script>
