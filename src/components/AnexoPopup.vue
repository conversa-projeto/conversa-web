<template>
  <div ref="popupRef" class="absolute bottom-full left-0 z-20 mb-2 min-w-[180px] rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg">
    <button
      v-for="item in itens"
      :key="item.tipo"
      class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-100"
      @click="emitirTipo(item.tipo)"
    >
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="item.bgClass">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4" :class="item.iconClass" v-html="item.path"></svg>
      </span>
      <span class="whitespace-nowrap">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/auth'
import { CodigoPermissao } from '../types/api'

type TipoAnexo = 'arquivo' | 'codigo' | 'votacao' | 'postagem' | 'confirmacao' | 'close'

// Votação e postagem só aparecem em grupo
const props = withDefaults(defineProps<{ comVotacao?: boolean }>(), { comVotacao: false })

const emit = defineEmits<{
  arquivo: []
  codigo: []
  votacao: []
  postagem: []
  confirmacao: []
  close: []
}>()

function emitirTipo(tipo: TipoAnexo) {
  ;(emit as (evt: string) => void)(tipo)
}

const popupRef = ref<HTMLElement>()

const todosItens = [
  {
    tipo: 'arquivo' as TipoAnexo,
    label: 'Arquivo',
    bgClass: 'bg-info-100 dark:bg-info-900',
    iconClass: 'text-info-600 dark:text-info-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />'
  },
  {
    tipo: 'codigo' as TipoAnexo,
    label: 'Código',
    bgClass: 'bg-success-100 dark:bg-success-900',
    iconClass: 'text-success-600 dark:text-success-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />'
  },
  {
    tipo: 'votacao' as TipoAnexo,
    label: 'Votação',
    bgClass: 'bg-warning-100 dark:bg-warning-900',
    iconClass: 'text-warning-600 dark:text-warning-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />'
  },
  {
    tipo: 'postagem' as TipoAnexo,
    label: 'Postagem',
    bgClass: 'bg-danger-100 dark:bg-danger-900',
    iconClass: 'text-danger-600 dark:text-danger-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />'
  },
  {
    tipo: 'confirmacao' as TipoAnexo,
    label: 'Confirmar leitura',
    bgClass: 'bg-primary-100 dark:bg-primary-900',
    iconClass: 'text-primary-600 dark:text-primary-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />'
  }
]

const auth = useAuthStore()

// Cada item some sem a permissão; Arquivo fica com qualquer uma dos anexos
const permitido: Partial<Record<TipoAnexo, () => boolean>> = {
  arquivo: () => [CodigoPermissao.Imagem, CodigoPermissao.Video, CodigoPermissao.Audio, CodigoPermissao.Arquivo].some((codigo) => auth.pode(codigo)),
  votacao: () => auth.pode(CodigoPermissao.Votacao),
  postagem: () => auth.pode(CodigoPermissao.Postagem),
  confirmacao: () => auth.pode(CodigoPermissao.Confirmacao),
}

const itens = computed(() => todosItens.filter((item) =>
  ((item.tipo !== 'votacao' && item.tipo !== 'postagem') || props.comVotacao) && (permitido[item.tipo]?.() ?? true)))

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
})
</script>
