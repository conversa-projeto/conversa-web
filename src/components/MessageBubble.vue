<template>
  <div
    :id="`msg-${mensagem.id}`"
    class="mb-[3px]"
    :class="isOwn ? 'flex justify-end' : 'flex justify-start'"
  >
    <div
      ref="wrapperRef"
      class="group/bubble relative w-fit max-w-[80%] rounded-xl bg-black/[0.01]"
      @mouseleave="onMouseLeave"
    >
      <component
        :is="componenteMap[tipoExibicao]"
        :mensagem="mensagem"
        :is-own="isOwn"
        :is-group="isGroup"
        :get-anexo-url="getAnexoUrl"
        @open-image="(id: string, nome: string) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id: string, nome: string) => emit('download', id, nome)"
        @go-to-message="(id: number) => emit('go-to-message', id)"
      />

      <MensagemAcoes
        v-if="mensagem.id > 0"
        :mensagem="mensagem"
        :is-own="isOwn"
        :menu-aberto="menuAcoesAberto"
        @reply="(msg) => emit('reply', msg)"
        @forward="(msg) => emit('forward', msg)"
        @menu-toggle="(aberto) => menuAcoesAberto = aberto"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Mensagem } from '../types/api'
import { classificarMensagem, TipoExibicaoMensagem } from '../utils/classificarMensagem'
import MensagemAcoes from './MensagemAcoes.vue'
import BolhaImagem from './BolhaImagem.vue'
import BolhaCodigo from './BolhaCodigo.vue'
import BolhaReferencia from './BolhaReferencia.vue'
import BolhaTextoCurto from './BolhaTextoCurto.vue'
import BolhaEmoji from './BolhaEmoji.vue'
import BolhaPadrao from './BolhaPadrao.vue'

const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
  'reply': [mensagem: Mensagem]
  'forward': [mensagem: Mensagem]
  'go-to-message': [mensagemId: number]
}>()

const wrapperRef = ref<HTMLElement>()
const menuAcoesAberto = ref(false)

function onMouseLeave() {
  if (menuAcoesAberto.value) {
    menuAcoesAberto.value = false
  }
}

const tipoExibicao = computed(() => classificarMensagem(props.mensagem))

const componenteMap = {
  [TipoExibicaoMensagem.Imagem]: BolhaImagem,
  [TipoExibicaoMensagem.Codigo]: BolhaCodigo,
  [TipoExibicaoMensagem.ComReferencia]: BolhaReferencia,
  [TipoExibicaoMensagem.Emoji]: BolhaEmoji,
  [TipoExibicaoMensagem.TextoCurto]: BolhaTextoCurto,
  [TipoExibicaoMensagem.Padrao]: BolhaPadrao,
} as const
</script>
