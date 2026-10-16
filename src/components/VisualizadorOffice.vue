<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[130] flex flex-col bg-black/85" @click.self="emit('fechar')">
      <div class="flex shrink-0 items-center gap-2 bg-chamada-900 px-3 py-2 text-sm text-white">
        <span class="min-w-0 flex-1 truncate font-medium" :title="nome">{{ nome }}</span>

        <!-- Word e PowerPoint: páginas e zoom (o Excel tem os controles dele) -->
        <div v-if="controle" class="flex shrink-0 items-center gap-0.5">
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 disabled:opacity-40 disabled:hover:bg-transparent" :title="formato === 'pptx' ? 'Slide anterior' : 'Página anterior'" :disabled="pagina === 0" @click="irPara(pagina - 1)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
          </button>
          <span class="flex items-center gap-1 text-xs tabular-nums">
            <input
              :value="pagina + 1"
              type="text"
              inputmode="numeric"
              class="w-10 rounded bg-white/10 px-1 py-0.5 text-center text-white outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40"
              :title="formato === 'pptx' ? 'Ir para o slide' : 'Ir para a página'"
              @focus="($event.target as HTMLInputElement).select()"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              @keydown.esc.stop="cancelarPagina"
              @change="irParaDigitada"
            />
            <span class="min-w-[2.5rem]" :title="paginasCompletas ? '' : 'Ainda contando as páginas'">/ {{ total }}{{ paginasCompletas ? '' : '…' }}</span>
          </span>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 disabled:opacity-40 disabled:hover:bg-transparent" :title="formato === 'pptx' ? 'Próximo slide' : 'Próxima página'" :disabled="pagina >= total - 1" @click="irPara(pagina + 1)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>

          <span class="mx-1 hidden h-5 w-px bg-white/20 sm:block"></span>

          <button type="button" class="hidden h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 sm:flex" title="Diminuir zoom" @click="zoom('menos')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>
          </button>
          <span class="hidden min-w-[3rem] text-center text-xs tabular-nums sm:block">{{ Math.round(escala * 100) }}%</span>
          <button type="button" class="hidden h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 sm:flex" title="Aumentar zoom" @click="zoom('mais')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
          <button type="button" class="hidden h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 sm:flex" :class="ajuste === 'pagina' ? 'bg-chamada-700' : ''" title="Página inteira" @click="ajustar('pagina')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          </button>
          <button type="button" class="hidden h-8 w-8 items-center justify-center rounded-full hover:bg-chamada-700 sm:flex" :class="ajuste === 'largura' ? 'bg-chamada-700' : ''" title="Ajustar à largura" @click="ajustar('largura')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h18m-4.5-13.5L21 7.5m0 0L16.5 12M21 7.5H3" /></svg>
          </button>

          <span class="mx-1 h-5 w-px bg-white/20"></span>
        </div>

        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Baixar" @click="emit('baixar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        </button>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Fechar (Esc)" @click="emit('fechar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="relative min-h-0 w-full flex-1">
        <!-- O documento é desenhado em canvas pelo @silurus/ooxml: nada do
             arquivo (scripts, links, formulários) roda na página. A área fica
             montada por baixo do carregando: o visualizador precisa do tamanho -->
        <div ref="area" class="h-full w-full bg-surface-100" @wheel.capture.passive="aoRodar" @pointerdown.capture="soltarPagina" @keydown.capture="soltarPagina"></div>
        <div v-if="erro" class="absolute inset-0 flex items-start justify-center bg-surface-100 pt-10 text-sm text-surface-600">{{ erro }}</div>
        <div v-else-if="etapa" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-100 text-sm text-surface-600">
          <svg class="h-8 w-8 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ etapa }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getAnexoUrl } from '../services/conversaApi'
import { carregarFontesOffice } from '../utils/fontesOffice'
import type { FormatoOffice } from '../utils/formatters'

const props = defineProps<{
  identificador: string
  nome: string
  formato: FormatoOffice
}>()

const emit = defineEmits<{
  fechar: []
  baixar: []
}>()

// O que Word e PowerPoint têm em comum para os controles
interface Controle {
  zoomIn(): void
  zoomOut(): void
  fitPage(): void
  fitWidth(): void
  getScale(): number
  setScale(escala: number): void
  irPara(indice: number): void
}

const area = ref<HTMLElement | null>(null)
const etapa = ref('Baixando arquivo...')
const erro = ref('')
const controle = ref<Controle | null>(null)
const pagina = ref(0)
const total = ref(0)
const paginasCompletas = ref(false)
const escala = ref(1)
// Ajuste que acompanha o tamanho da janela; zoom à mão desliga
const ajuste = ref<'pagina' | 'largura' | null>('pagina')
let visualizador: { destroy(): void } | null = null
let observador: ResizeObserver | null = null
let fechado = false
// Escala escolhida (pelo ajuste, pelos botões ou por Ctrl + roda). Enquanto
// pagina, a biblioteca reduz o zoom ao achar uma página mais larga (deitada):
// a escala dela é relativa à página mais larga. Essa mudança é desfeita.
let escalaEscolhida = 0
// Até quando a mudança de escala vem de Ctrl + roda do mouse
let zoomNaRodaAte = 0

// Espaço entre as páginas e nas bordas
const MARGEM = 16

const OPCOES = {
  // O fundo é o da área (bg-surface-100), no tema do app
  background: 'transparent',
  gap: MARGEM,
  enableTextSelection: true,
  // Quem ajusta à janela é o ResizeObserver daqui, pelo ajuste escolhido
  refitOnResize: false,
  // Lê e desenha num worker (a tela não trava) e mostra as primeiras páginas
  // enquanto o resto é paginado
  mode: 'worker' as const,
  progressiveLayout: true,
  onScaleChange: aoMudarEscala,
}

function aoMudarEscala(valor: number) {
  if (Date.now() < zoomNaRodaAte) escalaEscolhida = valor
  else if (escalaEscolhida && valor !== escalaEscolhida) {
    const escolhida = escalaEscolhida
    queueMicrotask(() => controle.value?.setScale(escolhida))
    return
  }
  escala.value = valor
}

// Muda a escala pelos comandos daqui e guarda a que ficou
function escolher(mudar: (atual: Controle) => void) {
  const atual = controle.value
  if (!atual) return
  escalaEscolhida = 0
  mudar(atual)
  escalaEscolhida = atual.getScale()
}

// Página escolhida nos botões ou no campo: fica no indicador até a pessoa
// rolar (a última página, se for baixa, nem chega ao topo da tela)
let paginaPedida: number | null = null

function soltarPagina() {
  paginaPedida = null
}

function aoMudarPagina(indice: number, quantas: number, completo: boolean) {
  pagina.value = paginaPedida ?? indice
  total.value = quantas
  paginasCompletas.value = completo
}

// O aviso de página visível só chega ao rolar ou num quadro de animação: o fim
// da paginação tira o "…" mesmo com a tela parada
function contagemCompleta(quantas: number) {
  if (fechado) return
  total.value = quantas
  paginasCompletas.value = true
}

async function abrir(arquivo: ArrayBuffer, alvo: HTMLElement) {
  if (props.formato === 'docx') {
    const { DocxScrollViewer } = await import('@silurus/ooxml/docx')
    if (fechado) return
    const docx = new DocxScrollViewer(alvo, { ...OPCOES, onVisiblePageChange: aoMudarPagina })
    visualizador = docx
    await docx.load(arquivo)
    void docx.waitUntilLayoutComplete().then(() => contagemCompleta(docx.pageCount))
    controle.value = { zoomIn: () => docx.zoomIn(), zoomOut: () => docx.zoomOut(), fitPage: () => docx.fitPage(), fitWidth: () => docx.fitWidth(), getScale: () => docx.getScale(), setScale: (e) => docx.setScale(e), irPara: (i) => docx.scrollToPage(i) }
  } else if (props.formato === 'pptx') {
    const { PptxScrollViewer } = await import('@silurus/ooxml/pptx')
    if (fechado) return
    const pptx = new PptxScrollViewer(alvo, { ...OPCOES, onVisibleSlideChange: aoMudarPagina })
    visualizador = pptx
    await pptx.load(arquivo)
    void pptx.waitUntilLayoutComplete().then(() => contagemCompleta(pptx.slideCount))
    controle.value = { zoomIn: () => pptx.zoomIn(), zoomOut: () => pptx.zoomOut(), fitPage: () => pptx.fitPage(), fitWidth: () => pptx.fitWidth(), getScale: () => pptx.getScale(), setScale: (e) => pptx.setScale(e), irPara: (i) => pptx.scrollToSlide(i) }
  } else {
    const { XlsxViewer } = await import('@silurus/ooxml/xlsx')
    if (fechado) return
    const xlsx = new XlsxViewer(alvo)
    visualizador = xlsx
    await xlsx.load(arquivo)
  }
}

function ajustar(modo: 'pagina' | 'largura') {
  const atual = controle.value
  const altura = area.value?.clientHeight ?? 0
  if (!atual || !altura) return
  ajuste.value = modo
  escolher(() => {
    if (modo === 'largura') {
      atual.fitWidth()
      return
    }
    // O fitPage deixa a página com a altura toda da área, sem as margens de
    // cima e de baixo: o pé da página ficaria cortado
    atual.fitPage()
    atual.setScale(atual.getScale() * Math.max(altura - 2 * MARGEM, 1) / altura)
  })
}

function zoom(direcao: 'mais' | 'menos') {
  ajuste.value = null
  escolher((atual) => {
    if (direcao === 'mais') atual.zoomIn()
    else atual.zoomOut()
  })
}

function irPara(indice: number) {
  pagina.value = Math.min(Math.max(indice, 0), total.value - 1)
  paginaPedida = pagina.value
  controle.value?.irPara(pagina.value)
}

// Número digitado no campo da página: vai até ela (fora do intervalo, a mais
// próxima); o que não é número volta a mostrar a página atual
function irParaDigitada(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const numero = Number.parseInt(campo.value, 10)
  if (Number.isFinite(numero)) irPara(numero - 1)
  campo.value = String(pagina.value + 1)
}

// Esc no campo desfaz o que foi digitado (e não fecha o visualizador)
function cancelarPagina(evento: KeyboardEvent) {
  const campo = evento.target as HTMLInputElement
  campo.value = String(pagina.value + 1)
  campo.blur()
}

// Ctrl + roda do mouse (ou pinça) é o zoom da biblioteca
function aoRodar(evento: WheelEvent) {
  soltarPagina()
  if (!evento.ctrlKey) return
  ajuste.value = null
  zoomNaRodaAte = Date.now() + 1000
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') emit('fechar')
}

onMounted(async () => {
  window.addEventListener('keydown', aoTeclar)
  try {
    const resposta = await fetch(await getAnexoUrl(props.identificador))
    if (!resposta.ok) throw new Error()
    const arquivo = await resposta.arrayBuffer()
    etapa.value = 'Preparando o documento...'
    await carregarFontesOffice(arquivo)
    if (fechado || !area.value) return
    await abrir(arquivo, area.value)
    if (fechado) return
    if (controle.value) {
      ajustar('pagina')
      observador = new ResizeObserver(() => { if (ajuste.value) ajustar(ajuste.value) })
      observador.observe(area.value)
    }
    etapa.value = ''
  } catch {
    erro.value = 'Não foi possível abrir o arquivo. Tente baixar.'
  }
})

onBeforeUnmount(() => {
  fechado = true
  window.removeEventListener('keydown', aoTeclar)
  observador?.disconnect()
  visualizador?.destroy()
})
</script>
