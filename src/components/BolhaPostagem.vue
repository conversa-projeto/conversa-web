<template>
  <div class="w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-surface-300 bg-surface-base text-surface-800 shadow-sm" data-postagem>
    <!-- Cabeçalho: postagem, de quem, e o título -->
    <div class="border-b border-surface-200 px-3 pb-2 pt-2">
      <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
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
          class="ml-auto font-medium text-primary-600 hover:underline dark:text-primary-400"
          @click.stop="alternarTodas"
        >{{ verTodas ? 'Mostrar menos' : `Ver todas as ${totalRespostas}` }}</button>
      </div>

      <div v-for="resposta in respostasVisiveis" :key="resposta.id" class="flex gap-2 py-1" :data-resposta="resposta.id">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-[10px] font-semibold text-surface-700">
          <img v-if="avatarDe(resposta.remetente_id)" :src="avatarDe(resposta.remetente_id)!" alt="" class="h-full w-full object-cover" data-avatar-resposta />
          <template v-else>{{ inicialNome(resposta.remetente) }}</template>
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

      <!-- A resposta é escrita no campo de mensagem (texto, anexos, áudio, figurinha...) -->
      <button
        type="button"
        class="mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition"
        :class="respondendoAqui ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-surface-300 bg-surface-base text-surface-500 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400'"
        data-responder-postagem
        @click.stop="chat.responderPostagem(mensagem)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" /></svg>
        {{ respondendoAqui ? 'Respondendo no campo de mensagem' : 'Responder à postagem' }}
      </button>
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
const verTodas = ref(false)
const respondendoAqui = computed(() => chat.postagemRespondendo?.id === props.mensagem.id)

const totalRespostas = computed(() => props.mensagem.postagem?.respostas ?? 0)
const respostasVisiveis = computed(() => (verTodas.value ? chat.respostasPorPostagem[props.mensagem.id] : undefined) ?? props.mensagem.postagem?.ultimas ?? [])

// Foto de quem respondeu: dos membros do grupo (ou dos contatos, ou a minha)
function avatarDe(usuarioId: number): string | null {
  return chat.usuariosConversa[props.mensagem.conversa_id]?.find((m) => m.usuario_id === usuarioId)?.avatar_url
    || chat.resolverNomeUsuario(usuarioId).avatar_url
    || null
}

async function alternarTodas() {
  verTodas.value = !verTodas.value
  if (verTodas.value) await chat.atualizarPostagem(props.mensagem.conversa_id, props.mensagem.id)
}

// Na tela, com a conversa aberta e a janela em foco, as respostas novas contam como vistas
function marcarVistas() {
  if (props.mensagem.id > 0 && props.mensagem.conversa_id === chat.conversaAtivaId && document.hasFocus()) {
    void chat.visualizarPostagem(props.mensagem)
  }
}

onMounted(() => {
  marcarVistas()
  void chat.carregarUsuariosConversa(props.mensagem.conversa_id)
})
watch(() => props.mensagem.postagem?.nao_lidas, marcarVistas)
</script>
