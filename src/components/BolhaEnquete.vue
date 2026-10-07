<template>
  <div
    class="w-72 max-w-full min-w-0 overflow-hidden rounded-xl px-3 pb-1 pt-2"
    :class="isOwn ? 'bg-primary-600 text-white' : 'bg-surface-300 dark:bg-surface-200 text-surface-800'"
  >
    <p v-if="isGroup && !isOwn" class="mb-0.5 text-xs font-semibold text-surface-500">{{ mensagem.remetente }}</p>

    <p v-if="!enquete && !erro" class="py-2 text-xs opacity-70">Carregando votação...</p>
    <p v-else-if="!enquete" class="py-2 text-xs opacity-70">{{ erro }}</p>

    <template v-else>
      <p class="text-sm font-semibold">📊 {{ enquete.pergunta }}</p>
      <p class="mb-2 text-[11px] opacity-70">{{ enquete.multipla ? 'Escolha uma ou mais opções' : 'Escolha uma opção' }}</p>

      <button
        v-for="opcao in enquete.opcoes"
        :key="opcao.id"
        type="button"
        class="mb-1.5 block w-full rounded-lg px-2 py-1.5 text-left transition disabled:cursor-wait"
        :class="isOwn ? 'hover:bg-white/10' : 'hover:bg-surface-400/30'"
        :disabled="votando"
        :title="opcao.votantes.map((v) => v.nome).join(', ') || 'Ninguém votou ainda'"
        @click="alternar(opcao.id)"
      >
        <span class="flex items-center gap-2 text-sm">
          <!-- Círculo na escolha única, quadrado na múltipla -->
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center border-2"
            :class="[
              enquete.multipla ? 'rounded' : 'rounded-full',
              isOwn ? 'border-white' : 'border-primary-600',
              marcada(opcao.id) ? (isOwn ? 'bg-white' : 'bg-primary-600') : '',
            ]"
          >
            <svg v-if="marcada(opcao.id)" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3" :class="isOwn ? 'text-primary-600' : 'text-white'"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
          </span>
          <span class="min-w-0 flex-1 break-words">{{ opcao.texto }}</span>
          <span class="shrink-0 text-xs font-semibold">{{ opcao.votantes.length }}</span>
        </span>
        <span class="mt-1 block h-1.5 overflow-hidden rounded-full" :class="isOwn ? 'bg-white/25' : 'bg-surface-400/40'">
          <span
            class="block h-full rounded-full transition-all duration-300"
            :class="isOwn ? 'bg-white' : 'bg-primary-500'"
            :style="{ width: `${porcentagem(opcao.votantes.length)}%` }"
          ></span>
        </span>
        <span v-if="opcao.votantes.length" class="mt-0.5 block truncate text-[10px] opacity-70">
          {{ opcao.votantes.map((v) => v.nome).join(', ') }}
        </span>
      </button>

      <p v-if="erro" class="text-[11px] text-danger-300">{{ erro }}</p>
      <p class="text-[11px] opacity-70">{{ enquete.total_votantes === 1 ? '1 pessoa votou' : `${enquete.total_votantes} pessoas votaram` }}</p>
    </template>

    <MensagemStatus :mensagem="mensagem" :is-own="isOwn" variante="padrao" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Mensagem } from '../types/api'
import { useEnquetesStore } from '../stores/enquetes'
import MensagemStatus from './MensagemStatus.vue'

const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const enquetes = useEnquetesStore()
const votando = ref(false)
const erro = ref('')

const id = computed(() => Number(props.mensagem.conteudos[0]?.conteudo))
const enquete = computed(() => enquetes.porId[id.value])

const marcada = (opcao: number) => !!enquete.value?.meus_votos.includes(opcao)

// Sobre quem votou, como no WhatsApp: na múltipla, as barras somam mais de 100%
function porcentagem(votos: number) {
  const total = enquete.value?.total_votantes ?? 0
  return total ? Math.round((votos / total) * 100) : 0
}

// Escolha única: clicar em outra troca, clicar na mesma tira. Múltipla: marca e desmarca.
async function alternar(opcao: number) {
  if (!enquete.value || votando.value) return
  const atuais = enquete.value.meus_votos
  const novos = marcada(opcao)
    ? atuais.filter((o) => o !== opcao)
    : enquete.value.multipla ? [...atuais, opcao] : [opcao]
  votando.value = true
  erro.value = ''
  try {
    await enquetes.votar(id.value, novos)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível votar'
  } finally {
    votando.value = false
  }
}

onMounted(() => {
  enquetes.carregar(id.value).catch((e) => {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a votação'
  })
})
</script>
