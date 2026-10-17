<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="emit('close')">
    <div class="mx-4 flex max-h-[95vh] w-full max-w-2xl flex-col rounded-xl bg-surface-base shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-200 px-5 py-3">
        <h3 class="text-sm font-semibold text-surface-800">{{ editando ? 'Editar localização' : 'Enviar localização' }}</h3>
        <button class="text-surface-400 hover:text-surface-600" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div class="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 py-3">
        <!-- Local ou trajeto -->
        <div class="flex rounded-lg bg-surface-100 p-0.5 text-sm">
          <button
            v-for="opcao in MODOS"
            :key="opcao.valor"
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 font-medium transition"
            :class="modo === opcao.valor ? 'bg-surface-base text-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700'"
            @click="trocarModo(opcao.valor)"
          >
            {{ opcao.rotulo }}
          </button>
        </div>

        <!-- Campos: o local, ou origem e destino. O ativo recebe o clique no mapa -->
        <div v-for="indice in indicesDoModo" :key="indice" class="relative">
          <div
            class="flex items-center gap-2 rounded-lg border bg-surface-100 px-2 py-1 transition"
            :class="ativo === indice ? 'border-primary-500' : 'border-surface-300'"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              :class="modo === 'local' ? 'bg-primary-600' : indice === 0 ? 'bg-success-600' : 'bg-danger-600'"
            >{{ modo === 'local' ? '•' : indice === 0 ? 'A' : 'B' }}</span>
            <input
              v-model="textos[indice]"
              type="text"
              class="min-w-0 flex-1 bg-transparent py-1 text-sm text-surface-800 outline-none placeholder:text-surface-400"
              :placeholder="modo === 'local' ? 'Endereço, lugar ou coordenadas' : indice === 0 ? 'Origem: endereço, lugar ou coordenadas' : 'Destino: endereço, lugar ou coordenadas'"
              @focus="ativo = indice"
              @keydown.enter.prevent="buscar(indice)"
              @keydown.esc.stop="resultados = []"
            />
            <button
              type="button"
              title="Buscar"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-surface-500 hover:bg-surface-200 hover:text-surface-800 disabled:opacity-50"
              :disabled="!textos[indice]?.trim()"
              @click="buscar(indice)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </button>
            <button
              type="button"
              title="Usar minha posição"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-surface-500 hover:bg-surface-200 hover:text-primary-600 disabled:opacity-50"
              :disabled="localizando !== null"
              @click="usarMinhaPosicao(indice)"
            >
              <svg v-if="localizando === indice" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" class="opacity-25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-3 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
            </button>
          </div>

          <!-- Resultados da busca -->
          <div
            v-if="resultados.length && campoResultados === indice"
            class="absolute inset-x-0 top-full z-[1100] mt-1 max-h-56 overflow-y-auto rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg"
          >
            <button
              v-for="(resultado, i) in resultados"
              :key="i"
              type="button"
              class="block w-full px-3 py-2 text-left text-xs text-surface-700 hover:bg-surface-100"
              @click="escolherResultado(indice, resultado)"
            >
              {{ resultado.nome }}
            </button>
          </div>
        </div>

        <MapaLeaflet
          ref="mapaRef"
          class="h-72 w-full shrink-0 overflow-hidden rounded-lg border border-surface-200"
          :pontos="pontosNoMapa"
          :linha="rota?.linha ?? null"
          interativo
          arrastavel
          @clique="(ponto) => definirPonto(ativo, ponto, true)"
          @mover="moverPonto"
        />

        <p class="min-h-[1rem] text-xs" :class="aviso ? 'text-danger-600 dark:text-danger-400' : 'text-surface-500'">
          <template v-if="aviso">{{ aviso }}</template>
          <template v-else-if="buscando">Buscando...</template>
          <template v-else-if="calculando">Calculando a rota...</template>
          <template v-else-if="modo === 'trajeto' && pontos[0] && pontos[1]">
            <template v-if="rota">{{ formatarDistancia(rota.distancia) }} · {{ formatarTempoTrajeto(rota.duracao) }} de carro</template>
            <template v-else>Sem rota pelas ruas: {{ formatarDistancia(distanciaReta(pontos[0], pontos[1])) }} em linha reta</template>
          </template>
          <template v-else>{{ dica }}</template>
        </p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end border-t border-surface-200 px-5 py-3">
        <div class="flex gap-2">
          <button class="rounded-lg px-4 py-1.5 text-sm text-surface-600 hover:bg-surface-100" @click="emit('close')">
            Cancelar
          </button>
          <!-- Inserir: vira um bloco no campo de mensagem, que vai junto com o resto -->
          <button
            v-if="!editando"
            class="rounded-lg border border-primary-600 px-4 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/30"
            :disabled="!pronta"
            @click="inserir"
          >
            Inserir na mensagem
          </button>
          <button
            class="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="!pronta"
            @click="editando ? inserir() : enviar()"
          >
            {{ editando ? 'Salvar' : 'Enviar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MapaLeaflet from './MapaLeaflet.vue'
import { buscarEndereco, calcularRota, nomeDoLugar, posicaoAtual, type Rota } from '../services/mapas'
import {
  decodificarRota, distanciaReta, ehTrajeto, formatarCoordenadas, formatarDistancia, formatarTempoTrajeto, lerCoordenadas,
  type Localizacao, type PontoLocalizacao,
} from '../utils/localizacao'

// Escolhe um local ou um trajeto (origem e destino): pela posição do
// aparelho, pela busca de endereço, por coordenadas digitadas ou clicando no
// mapa (os marcadores também se arrastam). Sem GPS, as outras formas bastam.
const props = defineProps<{
  inicial?: Localizacao
  // Editando o bloco que já está no campo: só salva
  editando?: boolean
}>()

const emit = defineEmits<{
  // Vai para o campo de mensagem (ou, editando, troca o bloco de lá)
  inserir: [localizacao: Localizacao]
  // Vai direto, numa mensagem só dela
  enviar: [localizacao: Localizacao]
  close: []
}>()

type Modo = 'local' | 'trajeto'
const MODOS: { valor: Modo; rotulo: string }[] = [
  { valor: 'local', rotulo: 'Local' },
  { valor: 'trajeto', rotulo: 'Trajeto' },
]
const LIMITE_NOME = 300

const modo = ref<Modo>(props.inicial && ehTrajeto(props.inicial) ? 'trajeto' : 'local')
const pontos = ref<(PontoLocalizacao | null)[]>([props.inicial?.pontos[0] ?? null, props.inicial?.pontos[1] ?? null])
const textos = ref<string[]>(pontos.value.map((p) => (p ? p.nome || formatarCoordenadas(p) : '')))
const ativo = ref(0)
const rota = ref<Rota | null>(props.inicial?.rota && props.inicial.distancia !== undefined && props.inicial.duracao !== undefined
  ? { rota: props.inicial.rota, distancia: props.inicial.distancia, duracao: props.inicial.duracao, linha: decodificarRota(props.inicial.rota) }
  : null)
const resultados = ref<PontoLocalizacao[]>([])
const campoResultados = ref<number | null>(null)
const buscando = ref(false)
const calculando = ref(false)
const localizando = ref<number | null>(null)
const aviso = ref('')
const mapaRef = ref<InstanceType<typeof MapaLeaflet>>()

const indicesDoModo = computed(() => (modo.value === 'local' ? [0] : [0, 1]))
const pontosNoMapa = computed(() => indicesDoModo.value.map((i) => pontos.value[i]).filter((p): p is PontoLocalizacao => !!p))
const pronta = computed(() => indicesDoModo.value.every((i) => pontos.value[i]) && !calculando.value)
const dica = computed(() => modo.value === 'local'
  ? 'Sem GPS? Busque o endereço, digite as coordenadas ou clique no mapa.'
  : `Clique no mapa para marcar ${ativo.value === 0 ? 'a origem' : 'o destino'}, ou busque o endereço.`)

function trocarModo(novo: Modo) {
  modo.value = novo
  resultados.value = []
  aviso.value = ''
  if (novo === 'trajeto' && pontos.value[0] && !pontos.value[1]) ativo.value = 1
  if (novo === 'local') ativo.value = 0
  requestAnimationFrame(() => mapaRef.value?.ajustar())
}

// Cada campo busca o nome do lugar por conta própria; o pedido antigo é cancelado
const pedidosNome: (AbortController | null)[] = [null, null]

function definirPonto(indice: number, ponto: PontoLocalizacao, buscarNome: boolean) {
  pontos.value[indice] = { lat: ponto.lat, lng: ponto.lng, ...(ponto.nome ? { nome: ponto.nome.slice(0, LIMITE_NOME) } : {}) }
  textos.value[indice] = ponto.nome || formatarCoordenadas(ponto)
  resultados.value = []
  aviso.value = ''
  pedidosNome[indice]?.abort()
  pedidosNome[indice] = null
  if (buscarNome) {
    const pedido = new AbortController()
    pedidosNome[indice] = pedido
    void nomeDoLugar(ponto, pedido.signal).then((nome) => {
      const atual = pontos.value[indice]
      if (!nome || pedido.signal.aborted || !atual) return
      atual.nome = nome.slice(0, LIMITE_NOME)
      textos.value[indice] = atual.nome
    })
  }
  // Marcou a origem com o destino vazio: o próximo clique é o destino
  if (modo.value === 'trajeto' && indice === 0 && !pontos.value[1]) ativo.value = 1
}

function moverPonto(indiceNoMapa: number, ponto: PontoLocalizacao) {
  const indice = indicesDoModo.value.filter((i) => pontos.value[i])[indiceNoMapa]
  if (indice !== undefined) definirPonto(indice, ponto, true)
}

let pedidoBusca: AbortController | null = null

async function buscar(indice: number) {
  const texto = textos.value[indice]?.trim() ?? ''
  if (!texto) return
  ativo.value = indice
  const coordenadas = lerCoordenadas(texto)
  if (coordenadas) {
    definirPonto(indice, coordenadas, true)
    mapaRef.value?.centralizar(coordenadas)
    return
  }
  pedidoBusca?.abort()
  const pedido = new AbortController()
  pedidoBusca = pedido
  buscando.value = true
  aviso.value = ''
  try {
    const lista = await buscarEndereco(texto, pedido.signal)
    if (pedido.signal.aborted) return
    resultados.value = lista
    campoResultados.value = indice
    if (!lista.length) aviso.value = 'Nada encontrado com esse endereço.'
  } catch (e) {
    if (!pedido.signal.aborted) aviso.value = e instanceof Error ? e.message : 'A busca de endereço falhou.'
  } finally {
    if (pedidoBusca === pedido) buscando.value = false
  }
}

function escolherResultado(indice: number, resultado: PontoLocalizacao) {
  definirPonto(indice, resultado, false)
  if (modo.value === 'local' || !pontos.value[indice === 0 ? 1 : 0]) mapaRef.value?.centralizar(resultado)
}

async function usarMinhaPosicao(indice: number, silencioso = false) {
  ativo.value = indice
  localizando.value = indice
  try {
    const posicao = await posicaoAtual()
    definirPonto(indice, posicao, true)
    mapaRef.value?.centralizar(posicao)
  } catch (e) {
    if (!silencioso) aviso.value = `${e instanceof Error ? e.message : 'Sem acesso à posição.'} Busque o endereço, digite as coordenadas ou clique no mapa.`
  } finally {
    localizando.value = null
  }
}

// Rota pelas ruas quando há origem e destino; sem resposta, fica a linha reta
let pedidoRota: AbortController | null = null
let esperaRota: ReturnType<typeof setTimeout> | undefined

watch(() => [modo.value, pontos.value[0]?.lat, pontos.value[0]?.lng, pontos.value[1]?.lat, pontos.value[1]?.lng], (_, anterior) => {
  // Abriu para editar com a rota já pronta: não recalcula
  if (!anterior && rota.value) return
  clearTimeout(esperaRota)
  pedidoRota?.abort()
  const [origem, destino] = pontos.value
  if (modo.value !== 'trajeto' || !origem || !destino) {
    rota.value = null
    calculando.value = false
    return
  }
  calculando.value = true
  esperaRota = setTimeout(async () => {
    const pedido = new AbortController()
    pedidoRota = pedido
    try {
      const nova = await calcularRota(origem, destino, pedido.signal)
      if (pedido.signal.aborted) return
      rota.value = nova
      calculando.value = false
      mapaRef.value?.ajustar()
    } catch {
      // Cancelado por outro ponto: o novo pedido cuida
    }
  }, 300)
}, { immediate: true })

function resultado(): Localizacao {
  const usados = indicesDoModo.value.map((i) => pontos.value[i]!)
  if (modo.value === 'local' || !rota.value) {
    return { pontos: usados, ...(modo.value === 'trajeto' ? { distancia: Math.round(distanciaReta(usados[0]!, usados[1]!)) } : {}) }
  }
  return { pontos: usados, rota: rota.value.rota, distancia: rota.value.distancia, duracao: rota.value.duracao }
}

function inserir() {
  if (pronta.value) emit('inserir', resultado())
}

function enviar() {
  if (pronta.value) emit('enviar', resultado())
}

function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape' && !resultados.value.length) emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', aoTeclar)
  // Abrindo do zero, já tenta a posição do aparelho; sem ela, a dica explica o resto
  if (!props.inicial) void usarMinhaPosicao(0, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', aoTeclar)
  clearTimeout(esperaRota)
  pedidoRota?.abort()
  pedidoBusca?.abort()
  pedidosNome.forEach((pedido) => pedido?.abort())
})
</script>
