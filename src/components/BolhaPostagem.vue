<template>
  <div class="w-[min(32rem,78vw)] min-w-0 overflow-hidden rounded-xl border border-surface-300 bg-surface-base text-surface-800 shadow-sm" data-postagem>
    <!-- Cabeçalho: postagem, de quem, e o título -->
    <div class="border-b border-surface-200 px-3 pb-2 pt-2">
      <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" /></svg>
        Postagem
        <span class="font-normal normal-case tracking-normal text-surface-500">· {{ isOwn ? 'Você' : mensagem.remetente }}</span>
      </p>
      <h4 v-if="mensagem.postagem?.titulo" class="mt-1 text-base font-semibold leading-snug text-surface-900">{{ mensagem.postagem.titulo }}</h4>
    </div>

    <!-- Conteúdo: texto e anexos, como numa mensagem -->
    <div class="px-3 pb-1 pt-2">
      <MessageContent
        v-for="conteudo in mensagem.conteudos"
        imagem-sem-moldura
        :key="`${mensagem.id}-${conteudo.id}-${conteudo.ordem}`"
        :conteudo="conteudo"
        :mensagem-id="mensagem.id"
        :conversa-id="mensagem.conversa_id"
        :reproduzida="mensagem.reproduzida"
        :is-own="false"
        :get-anexo-url="getAnexoUrl"
        @open-image="(id, nome) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id, nome) => emit('download', id, nome)"
      />
      <MensagemStatus :mensagem="mensagem" :is-own="false" variante="padrao" />
    </div>

    <!-- Respostas: as últimas (ou todas) e o campo para responder -->
    <div class="border-t border-surface-200 bg-surface-100 px-3 py-2" data-respostas-postagem>
      <div class="mb-1 flex items-center gap-2 text-xs text-surface-500">
        <span>{{ totalRespostas === 0 ? 'Nenhuma resposta ainda' : totalRespostas === 1 ? '1 resposta' : `${totalRespostas} respostas` }}</span>
        <span v-if="mensagem.postagem?.nao_lidas" class="rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold text-white">
          {{ mensagem.postagem.nao_lidas === 1 ? '1 nova' : `${mensagem.postagem.nao_lidas} novas` }}
        </span>
        <button
          v-if="totalRespostas > (mensagem.postagem?.ultimas.length ?? 0)"
          type="button"
          class="ml-auto font-medium text-primary-600 hover:underline"
          @click.stop="alternarTodas"
        >{{ verTodas ? 'Mostrar menos' : `Ver todas as ${totalRespostas}` }}</button>
      </div>

      <div v-for="resposta in respostasVisiveis" :key="resposta.id" class="flex gap-2 py-1" :data-resposta="resposta.id">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-300 text-[10px] font-semibold text-surface-700">
          {{ inicialNome(resposta.remetente) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-xs">
            <span class="font-semibold text-surface-800">{{ resposta.remetente_id === meuId ? 'Você' : resposta.remetente }}</span>
            <span class="ml-1.5 text-[10px] text-surface-500">{{ formatarHora(resposta.inserida) }}</span>
          </p>
          <p v-if="resposta.excluida_em" class="text-sm italic text-surface-500">Mensagem apagada</p>
          <template v-else>
          <MessageContent
            v-for="conteudo in resposta.conteudos"
            :key="`${resposta.id}-${conteudo.ordem}`"
            imagem-sem-moldura
            :conteudo="conteudo"
            :mensagem-id="resposta.id"
            :conversa-id="resposta.conversa_id"
            :reproduzida="resposta.reproduzida"
            :is-own="false"
            :get-anexo-url="getAnexoUrl"
            class="text-sm"
            @open-image="(id, nome) => emit('open-image', id, nome)"
            @download="(id, nome) => emit('download', id, nome)"
          />
          </template>
        </div>
      </div>

      <form class="mt-1.5 flex items-end gap-2" @submit.prevent="responder" @click.stop>
        <textarea
          v-model="texto"
          rows="1"
          placeholder="Responder à postagem"
          aria-label="Responder à postagem"
          class="max-h-28 min-h-[2rem] flex-1 resize-none rounded-lg border border-surface-300 bg-surface-base px-2.5 py-1.5 text-sm text-surface-800 outline-none placeholder:text-surface-500 focus:border-primary-500"
          @keydown.enter.exact.prevent="responder"
        ></textarea>
        <button
          type="submit"
          :disabled="!texto.trim() || enviando"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
          title="Responder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
        </button>
      </form>
      <p v-if="erro" class="mt-1 text-xs text-danger-600">{{ erro }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Mensagem } from '../types/api'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { formatarHora, inicialNome } from '../utils/formatters'
import MessageContent from './MessageContent.vue'
import MensagemStatus from './MensagemStatus.vue'

// Postagem de grupo: as respostas ficam aqui embaixo (não entram no fluxo da
// conversa). Aparecem as duas últimas; "ver todas" busca o resto.
const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  download: [identificador: string, nome: string]
}>()

const chat = useChatStore()
const meuId = useAuthStore().user?.id
const texto = ref('')
const enviando = ref(false)
const erro = ref('')
const verTodas = ref(false)

const totalRespostas = computed(() => props.mensagem.postagem?.respostas ?? 0)
const respostasVisiveis = computed(() => (verTodas.value ? chat.respostasPorPostagem[props.mensagem.id] : undefined) ?? props.mensagem.postagem?.ultimas ?? [])

async function alternarTodas() {
  verTodas.value = !verTodas.value
  if (verTodas.value) await chat.atualizarPostagem(props.mensagem.conversa_id, props.mensagem.id)
}

async function responder() {
  if (!texto.value.trim() || enviando.value) return
  enviando.value = true
  erro.value = ''
  try {
    await chat.responderPostagem(props.mensagem, texto.value)
    texto.value = ''
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao responder'
  } finally {
    enviando.value = false
  }
}

// Na tela, com a conversa aberta e a janela em foco, as respostas novas contam como vistas
function marcarVistas() {
  if (props.mensagem.id > 0 && props.mensagem.conversa_id === chat.conversaAtivaId && document.hasFocus()) {
    void chat.visualizarPostagem(props.mensagem)
  }
}

onMounted(marcarVistas)
watch(() => props.mensagem.postagem?.nao_lidas, marcarVistas)
</script>
