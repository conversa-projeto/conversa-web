<template>
  <div
    :id="`msg-${mensagem.id}`"
    :class="[isOwn ? 'flex justify-end' : 'flex justify-start', mudouRemetente ? 'mt-[12px]' : 'mt-[3px]']"
  >
    <div class="flex max-w-[80%] flex-col" :class="isOwn ? 'items-end' : 'items-start'">
      <div
        ref="wrapperRef"
        class="group/bubble relative flex w-fit items-start"
        @mouseleave="onMouseLeave"
        @contextmenu.prevent="onContextMenu"
      >
        <MensagemAcoes
          v-if="mensagem.id > 0"
          ref="acoesRef"
          :mensagem="mensagem"
          :is-own="isOwn"
          :menu-aberto="menuAcoesAberto"
          @reply="(msg) => emit('reply', msg)"
          @forward="(msg) => emit('forward', msg)"
          @reagir="(emoji) => emit('reagir', mensagem.id, emoji)"
          @menu-toggle="(aberto) => menuAcoesAberto = aberto"
        />

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
      </div>

      <!-- Reações existentes abaixo da bolha -->
      <div
        v-if="mensagem.reacoes && mensagem.reacoes.length > 0"
        class="flex flex-wrap gap-1 mt-0.5 px-1"
        :class="isOwn ? 'justify-end' : 'justify-start'"
      >
        <button
          v-for="reacao in mensagem.reacoes"
          :key="reacao.emoji"
          class="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition hover:bg-surface-100 dark:hover:bg-surface-600"
          :title="emojiNome(reacao.emoji)"
          :class="reacao.reagiu
            ? 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
            : 'border-surface-200 bg-white dark:border-surface-600 dark:bg-surface-700'"
          @click.stop="emit('reagir', mensagem.id, reacao.emoji)"
        >
          <span>{{ reacao.emoji }}</span>
          <span class="text-surface-500 dark:text-surface-400">{{ reacao.quantidade }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Mensagem } from '../types/api'
import { classificarMensagem, TipoExibicaoMensagem } from '../utils/classificarMensagem'
import MensagemAcoes from './MensagemAcoes.vue'
import { emojiNome } from '../utils/emojiNomes'
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
  mudouRemetente: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
  'reply': [mensagem: Mensagem]
  'forward': [mensagem: Mensagem]
  'go-to-message': [mensagemId: number]
  'reagir': [mensagemId: number, emoji: string]
}>()

const wrapperRef = ref<HTMLElement>()
const menuAcoesAberto = ref(false)
const acoesRef = ref<InstanceType<typeof MensagemAcoes>>()

function onMouseLeave() {
  if (menuAcoesAberto.value) {
    menuAcoesAberto.value = false
  }
}

function onContextMenu() {
  if (props.mensagem.id > 0 && acoesRef.value) {
    acoesRef.value.abrirViaContextMenu()
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
