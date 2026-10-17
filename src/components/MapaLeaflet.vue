<template>
  <!-- No escuro o mapa de ruas vai invertido; o satélite fica como é. A classe
       que muda fica aqui: no elemento do mapa ela apagaria as do Leaflet -->
  <div class="relative" :class="satelite ? '' : 'dark:[&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.95)_contrast(0.9)]'">
    <div
      ref="containerRef"
      class="absolute inset-0 isolate z-0 bg-surface-200 dark:[&_.leaflet-bar]:border-surface-300 dark:[&_.leaflet-bar_a]:border-surface-300 dark:[&_.leaflet-bar_a]:bg-surface-100 dark:[&_.leaflet-bar_a]:text-surface-800 dark:[&_.leaflet-bar_a:hover]:bg-surface-200 dark:[&_.leaflet-control-attribution]:bg-surface-100/80 dark:[&_.leaflet-control-attribution]:text-surface-600 dark:[&_.leaflet-control-attribution_a]:text-primary-400"
    />
    <button
      v-if="interativo"
      type="button"
      class="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded border-2 border-black/20 bg-white px-2 py-1 text-xs font-medium text-black hover:bg-[#f4f4f4] dark:border-surface-300 dark:bg-surface-100 dark:text-surface-800 dark:hover:bg-surface-200"
      :title="satelite ? 'Ver o mapa de ruas' : 'Ver a imagem de satélite'"
      @click.stop="satelite = !satelite"
    >
      <svg v-if="satelite" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
      {{ satelite ? 'Mapa' : 'Satélite' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PontoLocalizacao } from '../utils/localizacao'

// Mapa do OpenStreetMap com os pontos (um local, ou origem e destino) e a
// linha do trajeto: a rota pelas ruas ou, sem ela, uma reta tracejada.
// Interativo, tem o botão para trocar pela imagem de satélite (Esri World
// Imagery, com as ruas e os nomes dos lugares por cima, como o híbrido do Google).
// Fica num chunk próprio: quem usa importa este componente sob demanda.
const props = withDefaults(defineProps<{
  pontos: PontoLocalizacao[]
  linha?: [number, number][] | null
  // Arrastar, zoom e controles; sem ele o mapa é só uma imagem (na bolha)
  interativo?: boolean
  // Marcadores que se arrastam (na janela de escolher)
  arrastavel?: boolean
}>(), { linha: null, interativo: false, arrastavel: false })

const emit = defineEmits<{
  clique: [ponto: PontoLocalizacao]
  mover: [indice: number, ponto: PontoLocalizacao]
}>()

const containerRef = ref<HTMLElement>()
const satelite = ref(false)
let mapa: L.Map | null = null
let ruas: L.TileLayer | null = null
let imagem: L.LayerGroup | null = null
let camada: L.LayerGroup | null = null
let observador: ResizeObserver | null = null

const CENTRO_PADRAO: L.LatLngExpression = [-15.78, -47.93]

function icone(cor: string, letra: string) {
  return L.divIcon({
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    html: `<svg viewBox="0 0 28 38" class="h-[38px] w-7 drop-shadow ${cor}"><path fill="currentColor" stroke="white" stroke-width="2" d="M14 1C7 1 1.5 6.4 1.5 13.3 1.5 22.5 14 36.5 14 36.5S26.5 22.5 26.5 13.3C26.5 6.4 21 1 14 1Z"/>${letra ? `<text x="14" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="white">${letra}</text>` : '<circle cx="14" cy="13.3" r="4.5" fill="white"/>'}</svg>`,
  })
}

function desenhar() {
  if (!mapa || !camada) return
  camada.clearLayers()
  const trajeto = props.pontos.length === 2
  props.pontos.forEach((ponto, indice) => {
    const cor = !trajeto ? 'text-primary-600' : indice === 0 ? 'text-success-600' : 'text-danger-600'
    const marcador = L.marker([ponto.lat, ponto.lng], {
      icon: icone(cor, trajeto ? (indice === 0 ? 'A' : 'B') : ''),
      draggable: props.arrastavel,
      keyboard: props.interativo,
      title: ponto.nome ?? '',
    })
    marcador.on('dragend', () => {
      const { lat, lng } = marcador.getLatLng()
      emit('mover', indice, { lat, lng })
    })
    camada!.addLayer(marcador)
  })
  const [origem, destino] = props.pontos
  if (props.linha?.length) {
    camada.addLayer(L.polyline(props.linha, { className: 'stroke-primary-600', weight: 5, opacity: 0.85 }))
  } else if (origem && destino) {
    camada.addLayer(L.polyline([[origem.lat, origem.lng], [destino.lat, destino.lng]], { className: 'stroke-primary-600', weight: 3, dashArray: '6 8' }))
  }
}

// Enquadra os pontos e a linha
function ajustar() {
  if (!mapa) return
  const coordenadas: L.LatLngExpression[] = [...props.pontos.map((p) => [p.lat, p.lng] as [number, number]), ...(props.linha ?? [])]
  if (!coordenadas.length) {
    mapa.setView(CENTRO_PADRAO, 4)
  } else if (coordenadas.length === 1) {
    mapa.setView(coordenadas[0]!, 16)
  } else {
    mapa.fitBounds(L.latLngBounds(coordenadas), { padding: [28, 28], maxZoom: 17 })
  }
}

function centralizar(ponto: PontoLocalizacao, zoom = 16) {
  mapa?.setView([ponto.lat, ponto.lng], zoom)
}

onMounted(() => {
  mapa = L.map(containerRef.value!, {
    zoomControl: props.interativo,
    dragging: props.interativo,
    scrollWheelZoom: props.interativo,
    doubleClickZoom: props.interativo,
    touchZoom: props.interativo,
    boxZoom: props.interativo,
    keyboard: props.interativo,
    attributionControl: true,
  })
  mapa.attributionControl.setPrefix(false)
  ruas = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapa)
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
  imagem = L.layerGroup([
    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 18,
      attribution: 'Imagens © Esri, Maxar, Earthstar Geographics',
    }),
    // Ruas e nomes só até o nível 16, ampliados daí em diante: os níveis maiores
    // da Esri vêm de outra base, deslocada da imagem (em Jaru-RO, uns 30 a 40 m)
    L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, maxNativeZoom: 16 }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, maxNativeZoom: 16 }),
  ])
  camada = L.layerGroup().addTo(mapa)
  mapa.on('click', (e: L.LeafletMouseEvent) => emit('clique', { lat: e.latlng.lat, lng: e.latlng.lng }))
  desenhar()
  ajustar()
  // Janela que abre com animação ou bolha que muda de largura: o mapa refaz o tamanho
  observador = new ResizeObserver(() => mapa?.invalidateSize())
  observador.observe(containerRef.value!)
})

watch(() => [props.pontos, props.linha], desenhar, { deep: true })

watch(satelite, (ligado) => {
  if (!mapa || !ruas || !imagem) return
  if (ligado) {
    mapa.removeLayer(ruas)
    imagem.addTo(mapa)
  } else {
    mapa.removeLayer(imagem)
    ruas.addTo(mapa)
  }
})

onBeforeUnmount(() => {
  observador?.disconnect()
  mapa?.remove()
  mapa = null
})

defineExpose({ ajustar, centralizar })
</script>
