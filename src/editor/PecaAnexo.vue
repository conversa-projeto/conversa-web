<template>
  <NodeViewWrapper
    as="div"
    class="group/peca my-1 w-fit max-w-full rounded-lg data-[selecionada]:bg-primary-500/40"
    :class="selected ? 'ring-2 ring-primary-500' : ''"
    :data-anexo="node.attrs.id"
    :title="anexo?.nomeArquivo"
    contenteditable="false"
    data-drag-handle
  >
    <template v-if="anexo">
      <div v-if="tipo === 'imagem'" class="relative w-fit">
        <img
          :src="anexo.url"
          :alt="anexo.nomeArquivo"
          draggable="false"
          class="max-h-28 max-w-full cursor-zoom-in rounded-lg group-data-[selecionada]/peca:opacity-60"
          @click="extension.options.aoAbrirImagem(node.attrs.id)"
        />
        <!-- "×" no canto: tira a imagem (o Backspace também tira) -->
        <button
          type="button"
          data-remover
          title="Remover imagem"
          aria-label="Remover imagem"
          class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          @click.stop="deleteNode()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="pointer-events-none h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div v-else-if="tipo === 'video'" class="w-fit">
        <video :src="anexo.url" muted preload="metadata" class="pointer-events-none max-h-28 max-w-full rounded-lg bg-black group-data-[selecionada]/peca:opacity-60"></video>
        <span class="block truncate text-xs text-surface-500">🎬 {{ anexo.nomeArquivo }}</span>
      </div>
      <span v-else class="flex w-fit max-w-[16rem] items-center gap-1.5 rounded-lg bg-surface-200 px-2 py-1 text-xs text-surface-700">
        <span class="truncate">{{ rotulo }}</span>
      </span>
    </template>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { AnexoEditor } from './pecas'

// Imagem, vídeo, áudio ou arquivo no campo. O arquivo fica no mapa da
// extensão; o documento leva só a chave dele. Arrastar a peça muda a ordem.
const props = defineProps(nodeViewProps)

const anexo = computed(() => (props.extension.options.anexos as Map<string, AnexoEditor>).get(props.node.attrs.id))
const tipo = computed(() => {
  const mime = anexo.value?.mimeType ?? ''
  return mime.startsWith('image/') ? 'imagem' : mime.startsWith('video/') ? 'video' : 'outro'
})
const rotulo = computed(() => {
  const dados = anexo.value
  if (!dados) return ''
  if (dados.isGravacaoAudio) return '🎤 Gravação de áudio'
  return `${dados.isAudio ? '🎵' : '📄'} ${dados.nomeArquivo}`
})
</script>
