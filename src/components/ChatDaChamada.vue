<template>
  <div class="text-xs">
    <p v-if="carregando" class="py-2 text-center opacity-80">Carregando o chat...</p>
    <p v-else-if="erro" class="py-2 text-center opacity-80">{{ erro }}</p>
    <p v-else-if="!visiveis.length" class="py-2 text-center opacity-80">Ninguém escreveu no chat da chamada.</p>
    <!-- Como uma citação com vários participantes: quem, quando e as mensagens com os conteúdos delas -->
    <div v-else class="max-h-96 space-y-2 overflow-y-auto border-l-2 border-current pl-2" data-chat-da-chamada>
      <div v-for="mensagem in visiveis" :key="mensagem.id" data-mensagem-chat-chamada>
        <span class="font-semibold">{{ mensagem.remetente }}</span>
        <span class="ml-1 opacity-70">{{ formatarHora(mensagem.inserida) }}</span>
        <div class="mt-0.5 space-y-1 text-sm">
          <MessageContent
            v-for="conteudo in ordenados(mensagem)"
            :key="`${mensagem.id}-${conteudo.ordem}`"
            imagem-sem-moldura
            :conteudo="conteudo"
            :mensagem-id="mensagem.id"
            :conversa-id="mensagem.conversa_id"
            :reproduzida="mensagem.reproduzida"
            :is-own="false"
            :get-anexo-url="anexoUrl"
            @open-image="(id, nome) => emit('open-image', id, nome)"
            @download="(id, nome) => abrirAnexo(id, nome)"
          />
        </div>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 font-medium underline decoration-dotted underline-offset-2 opacity-90 hover:opacity-100"
      @click.stop="emit('abrir', conversaId)"
    >
      Abrir o chat completo
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getMensagens } from '../services/conversaApi'
import type { Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'
import { useAttachments } from '../composables/useAttachments'
import MessageContent from './MessageContent.vue'

// Chat criado durante a ligação, mostrado dentro da mensagem da ligação (ou do
// histórico), só para ler, com os conteúdos como no chat; para responder,
// abre o chat completo.
const props = defineProps<{ conversaId: number }>()

const emit = defineEmits<{
  abrir: [conversaId: number]
  'open-image': [identificador: string, nome: string]
}>()

const LIMITE = 100

const mensagens = ref<Mensagem[]>([])
const carregando = ref(true)
const erro = ref('')
const { anexoUrl, abrirAnexo } = useAttachments()

const visiveis = computed(() => mensagens.value.filter((m) => !m.excluida_em && m.conteudos.length))
const ordenados = (mensagem: Mensagem) => mensagem.conteudos.slice().sort((a, b) => a.ordem - b.ordem)

onMounted(async () => {
  try {
    mensagens.value = await getMensagens(props.conversaId, 0, LIMITE)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar o chat'
  } finally {
    carregando.value = false
  }
})
</script>
