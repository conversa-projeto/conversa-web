<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-surface-base shadow-xl" role="dialog" aria-label="Resumo da conversa">
      <div class="flex items-center gap-2 border-b border-surface-200 px-4 py-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-primary-600"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
        <h3 class="min-w-0 flex-1 text-base font-semibold text-surface-800">Resumo da conversa</h3>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200" title="Fechar" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-b border-surface-200 px-4 py-3">
        <button
          v-for="opcao in PERIODOS"
          :key="opcao.id"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50"
          :class="periodo === opcao.id ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'border-surface-300 text-surface-600 hover:bg-surface-100'"
          :disabled="processando"
          @click="periodo = opcao.id"
        >
          {{ opcao.nome }}
        </button>
        <button
          type="button"
          class="ml-auto rounded-xl bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="processando"
          @click="resumir"
        >
          {{ resumo && !processando ? 'Resumir de novo' : 'Resumir' }}
        </button>
      </div>

      <div class="min-h-[8rem] flex-1 overflow-y-auto px-4 py-3">
        <div v-if="processando" role="status" class="flex flex-col items-center gap-2 py-8 text-center text-sm text-surface-600">
          <svg class="h-6 w-6 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          <span>Resumindo {{ resumo?.mensagens ?? '' }} {{ resumo?.mensagens === 1 ? 'mensagem' : 'mensagens' }}...</span>
          <span class="text-xs text-surface-500">Pode levar alguns minutos, dependendo do servidor de IA.</span>
        </div>
        <p v-else-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
        <p v-else-if="!resumo" class="py-8 text-center text-sm text-surface-500">Escolha o período e toque em Resumir. As mensagens são separadas por assunto.</p>
        <p v-else-if="!resumo.assuntos.length" class="py-8 text-center text-sm text-surface-500">Nenhuma mensagem nesse período.</p>
        <div v-else class="space-y-3">
          <section v-for="(assunto, indice) in resumo.assuntos" :key="indice" class="rounded-xl border border-surface-200 p-3">
            <h4 class="text-sm font-semibold text-surface-800">{{ assunto.titulo }}</h4>
            <p class="mt-1 whitespace-pre-wrap text-sm text-surface-700">{{ assunto.resumo }}</p>
            <ul v-if="assunto.pendencias.length" class="mt-2 space-y-0.5">
              <li v-for="(pendencia, i) in assunto.pendencias" :key="i" class="flex items-start gap-1.5 text-xs text-surface-700">
                <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" />
                {{ pendencia }}
              </li>
            </ul>
            <button
              v-if="assunto.mensagens.length"
              type="button"
              class="mt-2 text-xs font-medium text-primary-600 hover:underline"
              @click="emit('go-to-message', assunto.mensagens[0]!)"
            >
              Ver na conversa ({{ assunto.mensagens.length }} {{ assunto.mensagens.length === 1 ? 'mensagem' : 'mensagens' }})
            </button>
          </section>
          <p class="text-center text-[11px] text-surface-500">Gerado por IA a partir de {{ resumo.mensagens }} mensagens. Confira na conversa antes de agir.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import * as api from '../services/conversaApi'
import type { PeriodoResumo, ResumoConversa } from '../types/api'

// Resumo da conversa pela IA, separado por assunto. O servidor resume em
// segundo plano; aqui se consulta até ficar pronto.
const props = defineProps<{ conversaId: number }>()

const emit = defineEmits<{
  close: []
  'go-to-message': [mensagemId: number]
}>()

const PERIODOS: Array<{ id: PeriodoResumo; nome: string }> = [
  { id: '24h', nome: 'Últimas 24 horas' },
  { id: '7d', nome: '7 dias' },
  { id: '30d', nome: '30 dias' },
  { id: 'recentes', nome: 'Últimas mensagens' },
]
const INTERVALO_CONSULTA_MS = 2000

const periodo = ref<PeriodoResumo>('24h')
const resumo = ref<ResumoConversa | null>(null)
const erro = ref('')
const processando = computed(() => resumo.value?.status === 'processando')
let consulta: number | null = null

function pararConsulta() {
  if (consulta !== null) window.clearTimeout(consulta)
  consulta = null
}

function aplicar(novo: ResumoConversa) {
  resumo.value = novo
  erro.value = novo.status === 'erro' ? novo.erro : ''
  if (novo.status === 'processando') {
    consulta = window.setTimeout(async () => {
      try {
        aplicar(await api.consultarResumo(novo.id))
      } catch (e) {
        resumo.value = null
        erro.value = e instanceof Error ? e.message : 'Erro ao consultar o resumo'
      }
    }, INTERVALO_CONSULTA_MS)
  }
}

async function resumir() {
  pararConsulta()
  erro.value = ''
  try {
    aplicar(await api.pedirResumo(props.conversaId, periodo.value))
  } catch (e) {
    resumo.value = null
    erro.value = e instanceof Error ? e.message : 'Erro ao pedir o resumo'
  }
}

onBeforeUnmount(pararConsulta)
</script>
