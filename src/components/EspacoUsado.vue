<template>
  <section class="rounded-2xl border border-surface-200 p-4">
    <h4 class="text-sm font-semibold text-surface-800">Armazenamento</h4>
    <p v-if="bytes === null" class="mt-1 text-sm text-surface-500">{{ erro || 'Calculando...' }}</p>
    <p v-else class="mt-1 text-sm text-surface-600">
      <span class="text-base font-semibold text-surface-800">{{ formatarTamanho(bytes) }}</span>
      usados pelos arquivos que você enviou (imagens, arquivos e áudios; cada arquivo conta uma vez, mesmo mandado em várias conversas).
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { formatarTamanho } from '../utils/formatters'

const bytes = ref<number | null>(null)
const erro = ref('')

onMounted(async () => {
  try {
    bytes.value = (await api.getEspacoUsado()).bytes
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível calcular o espaço usado'
  }
})
</script>
