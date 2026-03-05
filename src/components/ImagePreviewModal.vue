<template>
  <div
    v-if="aberta"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl">
      <p class="mb-3 text-sm font-medium text-slate-700">Pr&eacute;-visualiza&ccedil;&atilde;o da imagem</p>
      <div class="flex items-center justify-center rounded-xl bg-slate-100 p-2">
        <img :src="url" :alt="nome" class="max-h-[70vh] max-w-full rounded object-contain" />
      </div>
      <p class="mt-2 truncate text-xs text-slate-500">{{ nome }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="emit('close')">
          Cancelar
        </button>
        <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="emit('confirm')">
          Enviar imagem
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  aberta: boolean
  url: string
  nome: string
}>()

const emit = defineEmits<{
  'close': []
  'confirm': []
}>()
</script>
