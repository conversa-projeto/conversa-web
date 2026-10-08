<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <form class="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-base shadow-xl" @submit.prevent="criar">
      <div class="border-b border-surface-200 px-5 py-4">
        <h3 class="text-base font-semibold text-surface-900">Nova votação</h3>
      </div>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <label class="block text-sm font-medium text-surface-700">
          Pergunta
          <input
            ref="campoPergunta"
            v-model="pergunta"
            type="text"
            maxlength="300"
            placeholder="Ex.: Onde vamos almoçar?"
            class="mt-1 w-full rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </label>

        <div>
          <p class="text-sm font-medium text-surface-700">Opções</p>
          <div v-for="(_, indice) in opcoes" :key="indice" class="mt-2 flex items-center gap-2">
            <input
              v-model="opcoes[indice]"
              type="text"
              maxlength="200"
              :placeholder="`Opção ${indice + 1}`"
              class="min-w-0 flex-1 rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button
              v-if="opcoes.length > 2"
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-surface-500 hover:bg-surface-200 hover:text-danger-600"
              :title="`Remover opção ${indice + 1}`"
              @click="opcoes.splice(indice, 1)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button
            v-if="opcoes.length < MAXIMO_OPCOES"
            type="button"
            class="mt-2 text-sm font-medium text-primary-600 hover:underline"
            @click="opcoes.push('')"
          >+ Adicionar opção</button>
        </div>

        <label class="flex cursor-pointer items-start gap-3">
          <input v-model="multipla" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
          <span>
            <span class="block text-sm text-surface-800">Permitir várias escolhas</span>
            <span class="block text-xs text-surface-500">Cada pessoa pode marcar mais de uma opção.</span>
          </span>
        </label>

        <div>
          <label class="flex cursor-pointer items-start gap-3">
            <input v-model="comPrazo" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
            <span>
              <span class="block text-sm text-surface-800">Definir data final</span>
              <span class="block text-xs text-surface-500">Depois dela ninguém vota mais. Dá para mudar ou encerrar antes pela votação.</span>
            </span>
          </label>
          <div v-if="comPrazo" class="mt-2 pl-7">
            <CampoDataHora v-model="encerraEm" />
            <p v-if="erroDoPrazo" class="mt-1 text-xs text-danger-600">{{ erroDoPrazo }}</p>
          </div>
        </div>

        <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
      </div>

      <div class="flex justify-end gap-2 border-t border-surface-200 px-5 py-3">
        <button type="button" class="rounded-xl px-4 py-2 text-sm text-surface-600 hover:bg-surface-200" @click="emit('close')">Cancelar</button>
        <button
          type="submit"
          :disabled="!valida || criando"
          class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >{{ criando ? 'Criando...' : 'Criar votação' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { erroPrazo } from '../utils/prazoEnquete'
import CampoDataHora from './CampoDataHora.vue'

const MAXIMO_OPCOES = 12

const emit = defineEmits<{ close: []; criada: [] }>()

const chat = useChatStore()
const campoPergunta = ref<HTMLInputElement | null>(null)
const pergunta = ref('')
const opcoes = ref(['', ''])
const multipla = ref(false)
const comPrazo = ref(false)
// Sugestão: amanhã, na próxima hora cheia
const encerraEm = ref<Date | null>((() => {
  const sugestao = new Date()
  sugestao.setDate(sugestao.getDate() + 1)
  sugestao.setHours(sugestao.getHours() + 1, 0, 0, 0)
  return sugestao
})())
const criando = ref(false)
const erro = ref('')

const preenchidas = computed(() => opcoes.value.map((o) => o.trim()).filter(Boolean))
const erroDoPrazo = computed(() => (comPrazo.value ? erroPrazo(encerraEm.value) : ''))
const valida = computed(() => !!pergunta.value.trim() && preenchidas.value.length >= 2 && !erroDoPrazo.value)

onMounted(() => campoPergunta.value?.focus())

async function criar() {
  if (!valida.value || criando.value) return
  criando.value = true
  erro.value = ''
  try {
    await chat.criarEnquete(pergunta.value, preenchidas.value, multipla.value, comPrazo.value ? encerraEm.value : null)
    emit('criada')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível criar a votação'
  } finally {
    criando.value = false
  }
}
</script>
