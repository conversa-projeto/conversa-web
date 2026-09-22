<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[130] flex flex-col bg-black/85" @click.self="emit('fechar')">
      <div class="flex shrink-0 items-center gap-2 bg-chamada-900 px-3 py-2 text-sm text-white">
        <span class="min-w-0 flex-1 truncate font-medium" :title="nome">{{ nome }}</span>
        <span v-if="totalPaginas" class="shrink-0 text-xs text-chamada-300">{{ paginaAtual }} / {{ totalPaginas }}</span>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 disabled:opacity-40" title="Diminuir" :disabled="zoom <= ZOOM_MIN" @click="mudarZoom(-ZOOM_PASSO)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>
          </button>
          <button type="button" class="min-w-12 rounded px-1 text-xs text-chamada-300 hover:text-white" title="Ajustar à largura" @click="zoom = 1">{{ Math.round(zoom * 100) }}%</button>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 disabled:opacity-40" title="Aumentar" :disabled="zoom >= ZOOM_MAX" @click="mudarZoom(ZOOM_PASSO)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" /></svg>
          </button>
        </div>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Baixar" @click="emit('baixar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        </button>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Fechar (Esc)" @click="emit('fechar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div ref="rolagem" class="min-h-0 flex-1 overflow-auto" @scroll="atualizarPaginaAtual">
        <p v-if="erro" class="mt-10 text-center text-sm text-white/80">{{ erro }}</p>
        <p v-else-if="!totalPaginas" class="mt-10 text-center text-sm text-white/80">Carregando PDF...</p>
        <div v-else class="flex w-max min-w-full flex-col items-center gap-3 px-3 py-4">
          <canvas
            v-for="numero in totalPaginas"
            :key="numero"
            :ref="(el) => registrarPagina(el as HTMLCanvasElement | null, numero)"
            :data-pagina="numero"
            class="block bg-white shadow-lg"
            :style="{ width: larguraPagina + 'px', height: alturaPagina + 'px' }"
          ></canvas>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getAnexoUrl } from '../services/conversaApi'

const props = defineProps<{
  identificador: string
  nome: string
}>()

const emit = defineEmits<{
  fechar: []
  baixar: []
}>()

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_PASSO = 0.25

const rolagem = ref<HTMLElement | null>(null)
const documento = shallowRef<PDFDocumentProxy | null>(null)
const totalPaginas = ref(0)
const paginaAtual = ref(1)
const zoom = ref(1)
const erro = ref('')

// Tamanho de exibição das páginas, pela primeira página: zoom 100% = largura da tela
const larguraBase = ref(0)
const proporcao = ref(1.414)
const larguraPagina = ref(0)
const alturaPagina = ref(0)

const canvases = new Map<number, HTMLCanvasElement>()
const renderizadas = new Set<number>()
let observador: IntersectionObserver | null = null

function registrarPagina(el: HTMLCanvasElement | null, numero: number) {
  if (!el || canvases.get(numero) === el) return
  canvases.set(numero, el)
  observador?.observe(el)
}

// Zoom 100% = largura da área menos a margem, entre 240 e 900px
function medirLarguraBase() {
  const disponivel = (rolagem.value?.clientWidth || window.innerWidth) - 24
  larguraBase.value = Math.min(900, Math.max(240, disponivel))
}

function calcularTamanho() {
  larguraPagina.value = Math.round(larguraBase.value * zoom.value)
  alturaPagina.value = Math.round(larguraPagina.value * proporcao.value)
}

// Cada página é desenhada quando chega perto da área visível, na resolução da tela
async function renderizarPagina(numero: number) {
  const pdf = documento.value
  const canvas = canvases.get(numero)
  if (!pdf || !canvas || renderizadas.has(numero)) return
  renderizadas.add(numero)
  const pagina = await pdf.getPage(numero)
  const original = pagina.getViewport({ scale: 1 })
  const escala = (larguraPagina.value / original.width) * window.devicePixelRatio
  const viewport = pagina.getViewport({ scale: escala })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  // Páginas com proporção diferente da primeira ficam com a altura certa
  canvas.style.height = `${Math.round(viewport.height / window.devicePixelRatio)}px`
  await pagina.render({ canvas, viewport }).promise
}

function observarPaginas() {
  observador?.disconnect()
  observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (entrada.isIntersecting) void renderizarPagina(Number((entrada.target as HTMLElement).dataset.pagina))
    }
  }, { root: rolagem.value, rootMargin: '800px 0px' })
  for (const canvas of canvases.values()) observador.observe(canvas)
}

function mudarZoom(delta: number) {
  zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value + delta))
}

function redesenhar() {
  calcularTamanho()
  renderizadas.clear()
  observarPaginas()
}

watch(zoom, redesenhar)

// Janela redimensionada ou celular girado: a largura de 100% muda
function aoRedimensionar() {
  if (!documento.value) return
  medirLarguraBase()
  redesenhar()
}

function atualizarPaginaAtual() {
  const area = rolagem.value
  if (!area) return
  const meio = area.getBoundingClientRect().top + area.clientHeight / 3
  for (const [numero, canvas] of canvases) {
    if (canvas.getBoundingClientRect().bottom >= meio) {
      paginaAtual.value = numero
      return
    }
  }
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') emit('fechar')
}

onMounted(async () => {
  window.addEventListener('keydown', aoTeclar)
  window.addEventListener('resize', aoRedimensionar)
  try {
    const [pdfjs, worker, url] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      getAnexoUrl(props.identificador),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const pdf = await pdfjs.getDocument({ url }).promise
    documento.value = pdf
    const primeira = (await pdf.getPage(1)).getViewport({ scale: 1 })
    proporcao.value = primeira.height / primeira.width
    medirLarguraBase()
    calcularTamanho()
    totalPaginas.value = pdf.numPages
    observarPaginas()
  } catch {
    erro.value = 'Não foi possível abrir o PDF. Tente baixar o arquivo.'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', aoTeclar)
  window.removeEventListener('resize', aoRedimensionar)
  observador?.disconnect()
  void documento.value?.loadingTask.destroy()
})
</script>
