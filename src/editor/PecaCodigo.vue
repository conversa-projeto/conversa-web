<template>
  <NodeViewWrapper
    as="div"
    class="group/peca my-1 w-full max-w-md overflow-hidden rounded-lg border border-surface-300 bg-surface-100 data-[selecionada]:bg-primary-500/40"
    :class="selected ? 'ring-2 ring-primary-500' : ''"
    data-codigo
    contenteditable="false"
    data-drag-handle
  >
    <div class="flex items-center gap-1 border-b border-surface-200 px-2 py-1">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5 shrink-0 text-surface-500"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
      <span class="min-w-0 flex-1 truncate text-[11px] font-medium text-surface-600">{{ node.attrs.linguagem || 'texto' }} · {{ totalLinhas === 1 ? '1 linha' : `${totalLinhas} linhas` }}</span>
      <!-- Editar abre a janela de código; aqui dentro não se edita -->
      <button
        type="button"
        data-editar-codigo
        title="Editar código"
        aria-label="Editar código"
        class="flex h-6 w-6 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-800"
        @click.stop="editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="pointer-events-none h-3.5 w-3.5"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
      </button>
      <button
        type="button"
        data-remover
        title="Remover código"
        aria-label="Remover código"
        class="flex h-6 w-6 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-danger-600"
        @click.stop="deleteNode()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="pointer-events-none h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
    <!-- Prévia: as primeiras linhas -->
    <pre class="max-h-24 overflow-hidden whitespace-pre px-2 py-1.5 font-mono text-[11px] leading-snug text-surface-700 group-data-[selecionada]/peca:opacity-60">{{ previa }}</pre>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { CodigoEditor, OpcoesCodigo } from './pecas'

// Bloco de código no campo: linguagem, as primeiras linhas, editar (na janela
// de código) e remover. Vai na mensagem como um bloco ``` próprio.
const props = defineProps(nodeViewProps)

const LINHAS_NA_PREVIA = 4

const linhas = computed(() => String(props.node.attrs.codigo ?? '').split('\n'))
const totalLinhas = computed(() => linhas.value.length)
const previa = computed(() => {
  const inicio = linhas.value.slice(0, LINHAS_NA_PREVIA).join('\n')
  return totalLinhas.value > LINHAS_NA_PREVIA ? `${inicio}\n…` : inicio
})

function editar() {
  const atual: CodigoEditor = { linguagem: props.node.attrs.linguagem, codigo: props.node.attrs.codigo }
  ;(props.extension.options as OpcoesCodigo).aoEditar(atual, (novo) => props.updateAttributes(novo))
}
</script>
