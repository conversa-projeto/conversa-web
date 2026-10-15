<template>
  <div
    ref="popupRef"
    class="w-[320px] rounded-xl border border-surface-200 bg-surface-base shadow-lg"
    :class="estatico ? '' : [
      'absolute z-20',
      alinhamento === 'right' ? 'right-0' : 'left-0',
      direcao === 'cima' ? 'bottom-full mb-2' : 'top-full mt-2'
    ]"
  >
    <!-- Abas: só onde a figurinha pode ser enviada (no campo de mensagem) -->
    <div v-if="comFigurinhas" class="flex gap-1 border-b border-surface-200 px-2 pt-2">
      <button
        v-for="opcao in abas"
        :key="opcao.id"
        type="button"
        class="rounded-t-lg px-3 py-1.5 text-xs font-medium"
        :class="aba === opcao.id ? 'border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400' : 'text-surface-500 hover:text-surface-700'"
        @click="aba = opcao.id"
      >{{ opcao.nome }}</button>
    </div>

    <div v-if="aba === 'figurinhas'" class="max-h-[280px] overflow-y-auto p-2">
      <template v-for="pacote in PACOTES_FIGURINHAS" :key="pacote.id">
        <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">
          {{ pacote.nome }}
          <a
            v-if="pacote.credito"
            :href="pacote.credito.link"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-1 font-normal underline decoration-dotted underline-offset-2 hover:text-surface-600"
          >{{ pacote.credito.texto }}</a>
        </p>
        <div class="mb-2 grid grid-cols-4 gap-1">
          <button
            v-for="figurinha in pacote.figurinhas"
            :key="figurinha.id"
            type="button"
            class="flex items-center justify-center rounded-lg p-1 hover:bg-surface-100"
            :title="figurinha.nome"
            @click="emit('figurinha', figurinha.id)"
          >
            <FigurinhaLottie :id="figurinha.id" :tamanho="64" />
          </button>
        </div>
      </template>
    </div>

    <template v-else>
      <div class="border-b border-surface-200 p-2">
        <input
          v-model="busca"
          type="search"
          placeholder="Pesquisar emoji"
          aria-label="Pesquisar emoji"
          class="w-full rounded-full bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-none placeholder:text-surface-500 focus:ring-1 focus:ring-primary-400"
        />
      </div>

      <!-- Categorias: leva até ela; a atual fica marcada ao rolar -->
      <div v-if="!busca.trim()" class="flex justify-between border-b border-surface-200 px-1 py-1">
        <button
          v-for="categoria in navegacao"
          :key="categoria.id"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded text-base transition"
          :class="categoriaAtual === categoria.id ? 'bg-primary-100 dark:bg-primary-900' : 'opacity-60 hover:bg-surface-100 hover:opacity-100'"
          :title="categoria.nome"
          :aria-label="categoria.nome"
          @click="irPara(categoria.id)"
        >{{ categoria.icone }}</button>
      </div>

      <div ref="rolagem" class="relative h-[260px] overflow-y-auto p-2" @scroll="acompanharRolagem">
        <template v-if="busca.trim()">
          <div v-if="resultados.length" class="grid grid-cols-8 gap-0.5">
            <button v-for="item in resultados" :key="'res-' + item.emoji" type="button" class="rounded p-1 text-xl hover:bg-surface-100" :title="item.nome" @click="escolher(item.emoji)">{{ item.emoji }}</button>
          </div>
          <p v-else class="py-8 text-center text-sm text-surface-500">{{ carregado ? 'Nenhum emoji encontrado' : 'Carregando os emojis...' }}</p>
        </template>
        <template v-else>
          <section data-categoria="recentes">
            <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Recentes</p>
            <div class="mb-2 grid grid-cols-8 gap-0.5">
              <button v-for="emoji in recentes" :key="'rec-' + emoji" type="button" class="rounded p-1 text-xl hover:bg-surface-100" :title="nomeDo(emoji)" @click="escolher(emoji)">{{ emoji }}</button>
            </div>
          </section>
          <!-- Criar os botões de todas as categorias de uma vez trava a primeira
               abertura: cada uma ganha os botões ao chegar perto da vista e, até
               lá, ocupa a mesma altura -->
          <section
            v-for="categoria in categorias"
            :key="categoria.id"
            :ref="(el) => observarCategoria(el as Element | null)"
            :data-categoria="categoria.id"
          >
            <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">{{ categoria.nome }}</p>
            <div v-if="desenhadas.has(categoria.id)" class="mb-2 grid grid-cols-8 gap-0.5">
              <button v-for="item in categoria.emojis" :key="item.emoji" type="button" class="rounded p-1 text-xl hover:bg-surface-100" :title="item.nome" @click="escolher(item.emoji)">{{ item.emoji }}</button>
            </div>
            <div v-else class="mb-2" :style="{ height: `${alturaDaGrade(categoria.emojis.length)}px` }"></div>
          </section>
          <p v-if="!carregado" class="py-4 text-center text-xs text-surface-500">Carregando os emojis...</p>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { emojiNome } from '../utils/emojiNomes'
import { useEmojis } from '../composables/useEmojis'
import { PACOTES_FIGURINHAS } from '../utils/figurinhas'
import FigurinhaLottie from './FigurinhaLottie.vue'

withDefaults(defineProps<{
  alinhamento?: 'left' | 'right'
  direcao?: 'baixo' | 'cima'
  estatico?: boolean
  // Mostra a aba de figurinhas, que são enviadas na hora
  comFigurinhas?: boolean
}>(), {
  alinhamento: 'left',
  direcao: 'baixo',
  estatico: false,
  comFigurinhas: false
})

const emit = defineEmits<{
  selecionar: [emoji: string]
  figurinha: [id: string]
  close: []
}>()

// Abre sempre nos emojis, como no WhatsApp
const abas = [{ id: 'emojis', nome: 'Emojis' }, { id: 'figurinhas', nome: 'Figurinhas' }] as const
const aba = ref<(typeof abas)[number]['id']>('emojis')

const popupRef = ref<HTMLElement>()

// Todos os emojis, por categoria, com pesquisa (composables/useEmojis.ts)
const { categorias, carregado, recentes, usarEmoji, pesquisar } = useEmojis()
const busca = ref('')
const resultados = computed(() => pesquisar(busca.value))
const navegacao = computed(() => [{ id: 'recentes', nome: 'Recentes', icone: '🕒' }, ...categorias.value])
const categoriaAtual = ref('recentes')
const rolagem = ref<HTMLElement>()

const nomes = computed(() => new Map(categorias.value.flatMap((categoria) => categoria.emojis.map((item) => [item.emoji, item.nome] as const))))

function nomeDo(emoji: string) {
  return nomes.value.get(emoji) ?? emojiNome(emoji)
}

// Linhas de 8 emojis: 36px cada, 2px entre elas
function alturaDaGrade(quantidade: number) {
  return Math.ceil(quantidade / 8) * 38 - 2
}

// Categorias com os botões criados (ficam, depois de criados)
const desenhadas = ref(new Set<string>())
let observadorCategorias: IntersectionObserver | null = null

function observarCategoria(el: Element | null) {
  if (!el || !rolagem.value) return
  observadorCategorias ??= new IntersectionObserver((entradas) => {
    const novas = entradas.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.categoria ?? '')
    if (novas.length) desenhadas.value = new Set([...desenhadas.value, ...novas])
  }, { root: rolagem.value, rootMargin: '300px 0px' })
  observadorCategorias.observe(el)
  agendarProxima()
}

// Depois de abrir, as demais são criadas uma por vez, nos intervalos livres,
// para já estarem prontas quando a rolagem chegar nelas
let proximaAgendada = 0
const esperarLivre = (fn: () => void) => typeof requestIdleCallback === 'function' ? requestIdleCallback(fn) : window.setTimeout(fn, 50)
const cancelarEspera = (id: number) => typeof cancelIdleCallback === 'function' ? cancelIdleCallback(id) : window.clearTimeout(id)

function agendarProxima() {
  if (proximaAgendada) return
  proximaAgendada = esperarLivre(() => {
    proximaAgendada = 0
    const proxima = categorias.value.find((c) => !desenhadas.value.has(c.id))
    if (!proxima) return
    desenhadas.value = new Set([...desenhadas.value, proxima.id])
    agendarProxima()
  })
}

function escolher(emoji: string) {
  usarEmoji(emoji)
  emit('selecionar', emoji)
}

function secoes() {
  return [...(rolagem.value?.querySelectorAll<HTMLElement>('[data-categoria]') ?? [])]
}

function irPara(id: string) {
  const secao = secoes().find((el) => el.dataset.categoria === id)
  if (!secao || !rolagem.value) return
  rolagem.value.scrollTop = secao.offsetTop - 8
  categoriaAtual.value = id
}

// A categoria atual é a última que já começou acima do topo da rolagem
function acompanharRolagem() {
  if (!rolagem.value) return
  const topo = rolagem.value.scrollTop + 16
  const atual = secoes().filter((el) => el.offsetTop <= topo).pop()
  if (atual?.dataset.categoria) categoriaAtual.value = atual.dataset.categoria
}

function onClickOutside(e: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  observadorCategorias?.disconnect()
  if (proximaAgendada) cancelarEspera(proximaAgendada)
})
</script>
