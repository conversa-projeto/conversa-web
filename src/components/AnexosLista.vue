<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Filtros fixos -->
    <div class="shrink-0 border-b border-surface-300 px-4 py-3">
      <!-- Direcao -->
      <div class="flex gap-2">
        <button
          v-for="opcao in opcoesDirecao"
          :key="opcao.id"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="direcao === opcao.id ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'"
          @click="selecionarDirecao(opcao.id)"
        >{{ opcao.label }}</button>
      </div>
      <!-- Tipos -->
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="opcao in opcoesTipo"
          :key="opcao.id"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="tipoSelecionado === opcao.id ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'"
          @click="selecionarTipo(opcao.id)"
        >{{ opcao.label }}</button>
      </div>
    </div>

    <!-- Lista / Grid -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto"
      @scroll="aoScroll"
    >
      <div v-if="carregando && itens.length === 0" class="flex h-full items-center justify-center">
        <span class="text-sm text-surface-500">Carregando...</span>
      </div>

      <div v-else-if="!carregando && itens.length === 0" class="flex h-full items-center justify-center">
        <span class="text-sm text-surface-500">Nenhum anexo encontrado</span>
      </div>

      <!-- Grid para imagens (tipo 2) -->
      <div v-else-if="tipoSelecionado === TipoConteudo.Imagem" class="grid grid-cols-3 gap-1 p-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        <div
          v-for="item in itens"
          :key="item.anexo_id"
          class="group relative aspect-square overflow-hidden rounded bg-surface-200"
        >
          <button
            type="button"
            class="block h-full w-full transition hover:opacity-80"
            :title="item.nome"
            @click="abrirImagem(item)"
          >
            <img :src="item.url" :alt="item.nome" class="h-full w-full object-cover" loading="lazy" @error="marcarErro(item.anexo_id)" />
            <div v-if="erroCarregamento.has(item.anexo_id)" class="absolute inset-0 flex items-center justify-center bg-surface-300 text-xs text-surface-500">
              Erro
            </div>
          </button>
          <!-- Overlay com acoes: alinhadas a esquerda no topo -->
          <div class="absolute left-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-900/60 text-white transition hover:bg-surface-900/80"
              title="Abrir mensagem"
              @click.stop="emit('open-message', item.conversa_id, item.mensagem_id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
            </button>
            <a
              :href="item.url"
              :download="item.nome"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-900/60 text-white transition hover:bg-surface-900/80"
              title="Baixar"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Lista para arquivos / audios / gravacoes / todos -->
      <div v-else class="divide-y divide-surface-200">
        <div
          v-for="item in itens"
          :key="item.anexo_id"
          class="px-4 py-2.5 transition hover:bg-surface-100"
        >
          <div class="flex items-start gap-3">
            <!-- Icone por tipo -->
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600">
              <!-- Imagem inline (mix em "Todos") -->
              <img v-if="item.tipo === TipoConteudo.Imagem" :src="item.url" alt="" class="h-full w-full rounded-lg object-cover" loading="lazy" />
              <!-- Arquivo -->
              <svg v-else-if="item.tipo === TipoConteudo.Arquivo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <!-- Audio / Gravacao -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
            </div>

            <div class="min-w-0 flex-1 cursor-pointer" @click="abrirItem(item)">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-medium text-surface-800">{{ item.nome || 'Sem nome' }}</span>
              </div>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-surface-500">
                <span>{{ formatarTamanho(item.tamanho) }}</span>
                <span>·</span>
                <span>{{ formatarDataCurta(item.criado_em) }}</span>
                <span v-if="!conversaId">·</span>
                <span v-if="!conversaId" class="truncate">{{ item.conversa_descricao }}</span>
              </div>
              <div class="mt-0.5 text-xs text-surface-400 truncate">{{ item.autor_nome }}</div>
            </div>
          </div>

          <!-- Acoes + player na mesma linha, alinhados a esquerda (sob o icone) -->
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-700"
              title="Abrir mensagem"
              @click.stop="emit('open-message', item.conversa_id, item.mensagem_id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
            </button>

            <a
              :href="item.url"
              :download="item.nome"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-500 transition hover:bg-primary-50 dark:hover:bg-primary-900"
              title="Baixar"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </a>

            <audio
              v-if="item.tipo === TipoConteudo.Audio || item.tipo === TipoConteudo.GravacaoAudio"
              :src="item.url"
              controls
              preload="none"
              class="h-8 w-full max-w-[420px]"
            />
          </div>
        </div>
      </div>

      <!-- Loading paginacao -->
      <div v-if="carregando && itens.length > 0" class="flex justify-center py-3">
        <svg class="h-4 w-4 animate-spin text-surface-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnexoItem } from '../types/api'
import { TipoConteudo } from '../types/api'
import * as api from '../services/conversaApi'
import { formatarTamanho } from '../utils/formatters'

const props = withDefaults(defineProps<{
  conversaId?: number
}>(), {
  conversaId: 0
})

const emit = defineEmits<{
  'open-image-gallery': [item: AnexoItem, galeria: AnexoItem[]]
  'open-message': [conversaId: number, mensagemId: number]
}>()

type DirecaoFiltro = '' | 'enviados' | 'recebidos'
type TipoFiltro = 0 | typeof TipoConteudo.Imagem | typeof TipoConteudo.Arquivo | typeof TipoConteudo.Audio | typeof TipoConteudo.GravacaoAudio

const direcao = ref<DirecaoFiltro>('')
const tipoSelecionado = ref<TipoFiltro>(0)
const itens = ref<AnexoItem[]>([])
const carregando = ref(false)
const semMaisItens = ref(false)
const erroCarregamento = ref<Set<number>>(new Set())

const opcoesDirecao: Array<{ id: DirecaoFiltro; label: string }> = [
  { id: '', label: 'Todos' },
  { id: 'enviados', label: 'Enviados' },
  { id: 'recebidos', label: 'Recebidos' },
]

const opcoesTipo: Array<{ id: TipoFiltro; label: string }> = [
  { id: 0, label: 'Todos' },
  { id: TipoConteudo.Imagem, label: 'Imagens' },
  { id: TipoConteudo.Arquivo, label: 'Arquivos' },
  { id: TipoConteudo.Audio, label: 'Audios' },
  { id: TipoConteudo.GravacaoAudio, label: 'Gravacoes' },
]

const tiposApi = computed<number[]>(() => {
  if (tipoSelecionado.value === 0) return [TipoConteudo.Imagem, TipoConteudo.Arquivo, TipoConteudo.Audio, TipoConteudo.GravacaoAudio]
  return [tipoSelecionado.value]
})

async function carregar(mais = false) {
  if (carregando.value) return
  if (mais && semMaisItens.value) return
  carregando.value = true
  try {
    const antes = mais && itens.value.length > 0 ? itens.value[itens.value.length - 1].anexo_id : undefined
    const resposta = await api.getAnexos({
      conversa: props.conversaId || undefined,
      direcao: direcao.value || undefined,
      tipos: tiposApi.value,
      antes,
      limite: 60,
    })
    if (!mais) {
      itens.value = resposta
      erroCarregamento.value = new Set()
    } else {
      itens.value.push(...resposta)
    }
    if (resposta.length === 0 || resposta.length < 60) semMaisItens.value = true
  } catch {
    // silenciar — lista vazia, usuario ve estado vazio
  } finally {
    carregando.value = false
  }
}

function resetarECarregar() {
  itens.value = []
  semMaisItens.value = false
  erroCarregamento.value = new Set()
  void carregar(false)
}

function selecionarDirecao(novo: DirecaoFiltro) {
  if (direcao.value === novo) return
  direcao.value = novo
}

function selecionarTipo(novo: TipoFiltro) {
  if (tipoSelecionado.value === novo) return
  tipoSelecionado.value = novo
}

watch([direcao, tipoSelecionado, () => props.conversaId], () => {
  resetarECarregar()
}, { immediate: true })

// =============================================================================
// Infinite scroll
// =============================================================================
const scrollContainer = ref<HTMLElement | null>(null)

function aoScroll() {
  const c = scrollContainer.value
  if (!c) return
  if (carregando.value || semMaisItens.value) return
  const distanciaDoFinal = c.scrollHeight - c.scrollTop - c.clientHeight
  if (distanciaDoFinal <= c.clientHeight * 0.8) {
    void carregar(true)
  }
}

function marcarErro(anexoId: number) {
  erroCarregamento.value.add(anexoId)
  erroCarregamento.value = new Set(erroCarregamento.value)
}

function abrirImagem(item: AnexoItem) {
  const galeria = itens.value.filter(x => x.tipo === TipoConteudo.Imagem)
  emit('open-image-gallery', item, galeria)
}

function abrirItem(item: AnexoItem) {
  if (item.tipo === TipoConteudo.Imagem) {
    abrirImagem(item)
    return
  }
  if (item.tipo === TipoConteudo.Arquivo) {
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }
}

function formatarDataCurta(iso: string): string {
  const data = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(data.getTime())) return ''
  const hoje = new Date()
  const ehHoje = data.toDateString() === hoje.toDateString()
  if (ehHoje) {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
</script>
