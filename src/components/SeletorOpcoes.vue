<template>
  <div class="mt-1.5 inline-flex flex-wrap gap-1 rounded-xl bg-surface-200 p-1">
    <button
      v-for="opcao in opcoes"
      :key="String(opcao.valor)"
      type="button"
      class="rounded-lg px-3 py-1 text-xs font-medium transition"
      :class="opcao.valor === modelValue ? 'bg-primary-600 text-white' : 'text-surface-600 hover:text-surface-800'"
      @click="emit('update:modelValue', opcao.valor)"
    >{{ opcao.titulo }}</button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
// Botões lado a lado para escolher uma opção
defineProps<{
  modelValue: T
  opcoes: { valor: T; titulo: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [valor: T]
}>()
</script>
