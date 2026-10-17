<template>
  <NodeViewWrapper
    as="div"
    class="group/peca my-1 flex w-full max-w-md items-center gap-2 overflow-hidden rounded-lg border border-surface-300 bg-surface-100 px-2 py-1.5 data-[selecionada]:bg-primary-500/40"
    :class="selected ? 'ring-2 ring-primary-500' : ''"
    data-localizacao
    contenteditable="false"
    data-drag-handle
  >
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-300">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
    </span>
    <div class="min-w-0 flex-1 group-data-[selecionada]/peca:opacity-60">
      <p class="text-[11px] font-medium text-surface-500">{{ titulo }}</p>
      <p class="truncate text-xs text-surface-800">{{ resumo }}</p>
    </div>
    <!-- Editar abre a janela de localização; aqui dentro não se edita -->
    <button
      type="button"
      title="Editar localização"
      aria-label="Editar localização"
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-800"
      @click.stop="editar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="pointer-events-none h-3.5 w-3.5"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
    </button>
    <button
      type="button"
      data-remover
      title="Remover localização"
      aria-label="Remover localização"
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-danger-600"
      @click.stop="deleteNode()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="pointer-events-none h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
    </button>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { OpcoesLocalizacao } from './pecas'
import { ehTrajeto, lerLocalizacao, resumoLocalizacao } from '../utils/localizacao'

// Localização no campo: o resumo (local ou trajeto), editar (na janela de
// localização) e remover. Vai na mensagem como um conteúdo próprio (tipo 9).
const props = defineProps(nodeViewProps)

const localizacao = computed(() => lerLocalizacao(String(props.node.attrs.localizacao ?? '')))
const titulo = computed(() => (localizacao.value && ehTrajeto(localizacao.value) ? 'Trajeto' : 'Localização'))
const resumo = computed(() => (localizacao.value ? resumoLocalizacao(localizacao.value) : ''))

function editar() {
  ;(props.extension.options as OpcoesLocalizacao).aoEditar(String(props.node.attrs.localizacao ?? ''), (nova) => props.updateAttributes({ localizacao: nova }))
}
</script>
