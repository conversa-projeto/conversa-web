<template>
  <div class="min-w-[12rem] text-sm">
    <template v-if="enquete">
      <p class="font-semibold">📊 {{ enquete.pergunta }}</p>
      <p
        v-for="opcao in enquete.opcoes"
        :key="opcao.id"
        class="mt-0.5 flex justify-between gap-3 text-xs"
        :title="opcao.votantes.map((v) => v.nome).join(', ') || 'Ninguém votou'"
      >
        <span class="min-w-0 break-words">{{ opcao.texto }}</span>
        <span class="shrink-0 font-semibold">{{ opcao.votantes.length }}</span>
      </p>
    </template>
    <p v-else class="text-xs opacity-70">{{ erro || 'Carregando votação...' }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useEnquetesStore } from '../stores/enquetes'

// Votação só para leitura: a que aparece numa mensagem oculta revelada
const props = defineProps<{ id: number }>()

const enquetes = useEnquetesStore()
const enquete = computed(() => enquetes.porId[props.id])
const erro = ref('')

onMounted(() => {
  enquetes.carregar(props.id).catch((e) => { erro.value = e instanceof Error ? e.message : 'Não foi possível abrir a votação.' })
})
</script>
