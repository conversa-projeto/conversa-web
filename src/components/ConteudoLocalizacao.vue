<template>
  <div v-if="localizacao" class="w-72 max-w-full overflow-hidden rounded-lg">
    <!-- Na bolha o mapa é só imagem (não briga com a rolagem); o clique amplia -->
    <button type="button" class="relative block h-40 w-full cursor-zoom-in" title="Ampliar mapa" @click="ampliado = true">
      <MapaLeaflet class="pointer-events-none h-full w-full" :pontos="localizacao.pontos" :linha="linha" />
    </button>
    <div class="flex items-start gap-2 px-2 py-1.5">
      <div class="min-w-0 flex-1">
        <!-- Trajeto: origem e destino, cada um na sua linha -->
        <template v-if="ehTrajeto(localizacao)">
          <p v-for="(ponto, i) in localizacao.pontos" :key="i" class="flex min-w-0 items-center gap-1.5 text-sm">
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" :class="i === 0 ? 'bg-success-600' : 'bg-danger-600'">{{ i === 0 ? 'A' : 'B' }}</span>
            <span class="truncate font-medium" :title="nomePonto(ponto)">{{ nomePonto(ponto) }}</span>
          </p>
          <p class="truncate text-xs opacity-70">{{ descricaoTrajeto(localizacao) }}</p>
        </template>
        <p v-else class="line-clamp-2 text-sm font-medium" :title="nomePonto(localizacao.pontos[0]!)">{{ nomePonto(localizacao.pontos[0]!) }}</p>
      </div>
      <a
        :href="linkMapa(localizacao)"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium hover:underline"
        :class="isOwn ? 'text-enviada-destaque' : 'text-primary-600 dark:text-primary-400'"
      >
        Abrir no Google Maps
      </a>
    </div>
    <VisualizadorLocalizacao v-if="ampliado" :localizacao="localizacao" @close="ampliado = false" />
  </div>
  <p v-else class="text-xs opacity-70">Localização</p>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MapaLeaflet from './MapaLeaflet.vue'
import VisualizadorLocalizacao from './VisualizadorLocalizacao.vue'
import { decodificarRota, descricaoTrajeto, ehTrajeto, lerLocalizacao, linkMapa, nomePonto } from '../utils/localizacao'

// Local ou trajeto na mensagem: o mapa, o nome (ou origem → destino), a
// distância e o tempo do trajeto e o link para o Google Maps
const props = defineProps<{
  conteudo: string
  isOwn?: boolean
}>()

const localizacao = computed(() => lerLocalizacao(props.conteudo))
const linha = computed(() => (localizacao.value?.rota ? decodificarRota(localizacao.value.rota) : null))
const ampliado = ref(false)
</script>
