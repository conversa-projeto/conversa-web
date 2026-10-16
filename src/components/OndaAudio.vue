<template>
  <!-- Onda do áudio (intensidade gravada no envio): as barras já tocadas ficam na cor de destaque -->
  <div class="flex h-full items-center gap-[2px]" aria-hidden="true">
    <span
      v-for="(nivel, indice) in intensidade"
      :key="indice"
      class="min-w-0 flex-1 rounded-full"
      :class="(indice / intensidade.length) * 100 < progresso
        ? (isOwn ? 'bg-enviada-destaque' : 'bg-primary-500')
        : (isOwn ? 'bg-enviada-suave/40' : 'bg-surface-500/60')"
      :style="{ height: `${Math.max(12, nivel)}%` }"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  intensidade: number[]
  progresso: number
  isOwn?: boolean
}>()
</script>
