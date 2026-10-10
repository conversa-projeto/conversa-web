<template>
  <div class="text-xs">
    <p v-if="carregando" class="py-2 text-center opacity-80">Carregando o chat...</p>
    <p v-else-if="erro" class="py-2 text-center opacity-80">{{ erro }}</p>
    <p v-else-if="!linhas.length" class="py-2 text-center opacity-80">Ninguém escreveu no chat da chamada.</p>
    <!-- Como uma citação com vários participantes: quem, quando e o quê -->
    <div v-else class="max-h-64 space-y-1.5 overflow-y-auto border-l-2 border-current pl-2" data-chat-da-chamada>
      <div v-for="linha in linhas" :key="linha.id">
        <span class="font-semibold">{{ linha.autor }}</span>
        <span class="ml-1 opacity-70">{{ linha.hora }}</span>
        <p class="whitespace-pre-wrap break-words opacity-90">{{ linha.texto }}</p>
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
import { TipoConteudo, type ConteudoMensagem, type Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'

// Chat criado durante a ligação, mostrado dentro da mensagem da ligação (ou do
// histórico), só para ler; para responder, abre o chat completo.
const props = defineProps<{ conversaId: number }>()

const emit = defineEmits<{ abrir: [conversaId: number] }>()

const LIMITE = 100

const mensagens = ref<Mensagem[]>([])
const carregando = ref(true)
const erro = ref('')

function descrever(conteudo: ConteudoMensagem) {
  switch (Number(conteudo.tipo)) {
    case TipoConteudo.Texto:
      return conteudo.conteudo.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1')
    case TipoConteudo.Imagem:
      return '📷 Imagem'
    case TipoConteudo.Arquivo:
      return `📎 ${conteudo.nome || 'Arquivo'}`
    case TipoConteudo.Audio:
    case TipoConteudo.GravacaoAudio:
      return conteudo.transcricao ? `🎤 "${conteudo.transcricao}"` : '🎤 Áudio'
    case TipoConteudo.Figurinha:
      return 'Figurinha'
    case TipoConteudo.Enquete:
      return '📊 Votação'
    default:
      return ''
  }
}

const linhas = computed(() => mensagens.value
  .filter((m) => !m.excluida_em)
  .map((m) => ({
    id: m.id,
    autor: m.remetente,
    hora: formatarHora(m.inserida),
    texto: m.conteudos.slice().sort((a, b) => a.ordem - b.ordem).map(descrever).filter(Boolean).join('\n'),
  }))
  .filter((linha) => linha.texto))

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
