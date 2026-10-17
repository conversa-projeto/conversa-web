<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-6" @click.self="emit('close')">
      <div class="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-surface-base text-surface-800 shadow-2xl">
        <div class="flex items-center gap-3 border-b border-surface-200 px-4 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold" :title="titulo">{{ titulo }}</p>
            <p class="truncate text-xs text-surface-500">{{ ehTrajeto(localizacao) ? descricaoTrajeto(localizacao) : formatarCoordenadas(localizacao.pontos[0]!) }}</p>
          </div>
          <a
            :href="linkMapa(localizacao)"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
          >
            Abrir no Google Maps
          </a>
          <button class="shrink-0 text-surface-400 hover:text-surface-600" title="Fechar" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <MapaLeaflet class="min-h-0 w-full flex-1" :pontos="localizacao.pontos" :linha="linha" interativo />
        <!-- Trajeto: origem e destino com o nome inteiro -->
        <div v-if="ehTrajeto(localizacao)" class="grid gap-1 border-t border-surface-200 px-4 py-2 text-xs sm:grid-cols-2">
          <p v-for="(ponto, i) in localizacao.pontos" :key="i" class="flex min-w-0 items-center gap-2">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" :class="i === 0 ? 'bg-success-600' : 'bg-danger-600'">{{ i === 0 ? 'A' : 'B' }}</span>
            <span class="truncate" :title="nomePonto(ponto)">{{ nomePonto(ponto) }}</span>
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import MapaLeaflet from './MapaLeaflet.vue'
import { decodificarRota, descricaoTrajeto, ehTrajeto, formatarCoordenadas, linkMapa, nomePonto, type Localizacao } from '../utils/localizacao'

// Mapa grande, com arrastar e zoom, do local ou trajeto de uma mensagem
const props = defineProps<{ localizacao: Localizacao }>()
const emit = defineEmits<{ close: [] }>()

const linha = computed(() => (props.localizacao.rota ? decodificarRota(props.localizacao.rota) : null))
const titulo = computed(() => (ehTrajeto(props.localizacao) ? props.localizacao.pontos.map(nomePonto).join(' → ') : nomePonto(props.localizacao.pontos[0]!)))

function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', aoTeclar))
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>
