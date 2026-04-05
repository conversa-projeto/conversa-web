<template>
  <div ref="containerRef" class="relative">
    <div
      class="flex w-[100px] cursor-pointer items-center gap-1 rounded-lg border border-surface-300 bg-surface-100 px-2 py-1 text-xs transition"
      @click="aberto = !aberto"
    >
      <span :class="modelValue ? 'text-surface-700' : 'text-surface-500'" class="flex-1">
        {{ modelValue ? formatarExibicao(modelValue) : placeholder }}
      </span>
      <button
        v-if="modelValue"
        class="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-surface-500 hover:bg-surface-300 hover:text-surface-700"
        @click.stop="limpar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3 w-3">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="ml-auto h-3 w-3 shrink-0 text-surface-500">
        <path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 7a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7Z" clip-rule="evenodd" />
      </svg>
    </div>

    <!-- Calendario dropdown -->
    <div
      v-if="aberto"
      class="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-surface-300 bg-surface-base p-2 shadow-lg"
    >
      <!-- Header navegacao -->
      <div class="mb-1 flex items-center justify-between">
        <button
          class="flex h-6 w-6 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-700"
          @click.stop="mesAnterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5">
            <path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
          </svg>
        </button>
        <span class="text-xs font-medium text-surface-700">{{ nomesMeses[mesCal] }} {{ anoCal }}</span>
        <button
          class="flex h-6 w-6 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-700"
          @click.stop="mesSeguinte"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5">
            <path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Dias da semana -->
      <div class="grid grid-cols-7 text-center text-[10px] font-medium text-surface-400">
        <span v-for="d in diasSemana" :key="d">{{ d }}</span>
      </div>

      <!-- Dias do mes -->
      <div class="mt-0.5 grid grid-cols-7 text-center text-xs">
        <button
          v-for="(dia, i) in diasGrid"
          :key="i"
          class="flex h-6 w-full items-center justify-center rounded transition"
          :class="classeDia(dia)"
          :disabled="!dia.mesAtual"
          @click.stop="selecionarDia(dia)"
        >
          {{ dia.num }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const aberto = ref(false)
const containerRef = ref<HTMLElement>()

const hoje = new Date()
const mesCal = ref(hoje.getMonth())
const anoCal = ref(hoje.getFullYear())

const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

watch(aberto, (val) => {
  if (val && props.modelValue) {
    const [a, m] = props.modelValue.split('-').map(Number)
    anoCal.value = a
    mesCal.value = m - 1
  }
})

interface DiaGrid { num: number; mesAtual: boolean; iso: string }

const diasGrid = computed<DiaGrid[]>(() => {
  const ano = anoCal.value
  const mes = mesCal.value
  const primeiro = new Date(ano, mes, 1)
  const diaSemanaInicio = primeiro.getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const ultimoDiaMesAnt = new Date(ano, mes, 0).getDate()

  const dias: DiaGrid[] = []

  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const d = ultimoDiaMesAnt - i
    const mAnt = mes === 0 ? 11 : mes - 1
    const aAnt = mes === 0 ? ano - 1 : ano
    dias.push({ num: d, mesAtual: false, iso: `${aAnt}-${String(mAnt + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  for (let d = 1; d <= ultimoDia; d++) {
    dias.push({ num: d, mesAtual: true, iso: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  const restante = 42 - dias.length
  for (let d = 1; d <= restante; d++) {
    const mSeg = mes === 11 ? 0 : mes + 1
    const aSeg = mes === 11 ? ano + 1 : ano
    dias.push({ num: d, mesAtual: false, iso: `${aSeg}-${String(mSeg + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  return dias
})

const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

function classeDia(dia: DiaGrid): string {
  if (!dia.mesAtual) return 'text-surface-300 cursor-default'
  if (dia.iso === props.modelValue) return 'bg-primary-600 text-white font-medium'
  if (dia.iso === hojeIso) return 'ring-1 ring-primary-500 text-primary-600 hover:bg-surface-200 cursor-pointer'
  return 'text-surface-700 hover:bg-surface-200 cursor-pointer'
}

function selecionarDia(dia: DiaGrid) {
  if (!dia.mesAtual) return
  emit('update:modelValue', dia.iso)
  aberto.value = false
}

function limpar() {
  emit('update:modelValue', '')
}

function mesAnterior() {
  if (mesCal.value === 0) { mesCal.value = 11; anoCal.value-- }
  else mesCal.value--
}

function mesSeguinte() {
  if (mesCal.value === 11) { mesCal.value = 0; anoCal.value++ }
  else mesCal.value++
}

function formatarExibicao(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function onClickFora(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    aberto.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickFora))
onBeforeUnmount(() => document.removeEventListener('click', onClickFora))
</script>
