<template>
  <NodeViewWrapper
    as="div"
    class="group/peca my-1 h-16 w-16 rounded-lg data-[selecionada]:bg-primary-500/40"
    :class="selected ? 'ring-2 ring-primary-500' : ''"
    :data-figurinha="node.attrs.figurinha"
    :title="nomeFigurinha(node.attrs.figurinha)"
    contenteditable="false"
    data-drag-handle
  >
    <FigurinhaLottie :id="node.attrs.figurinha" :tamanho="64" />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import FigurinhaLottie from '../components/FigurinhaLottie.vue'
import { nomeFigurinha } from '../utils/figurinhas'

// Figurinha no meio do texto do campo
defineProps(nodeViewProps)
</script>
