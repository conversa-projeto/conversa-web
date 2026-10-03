<template>
  <div
    ref="popupRef"
    class="w-[320px] rounded-xl border border-surface-200 bg-surface-base shadow-lg"
    :class="estatico ? '' : [
      'absolute z-20',
      alinhamento === 'right' ? 'right-0' : 'left-0',
      direcao === 'cima' ? 'bottom-full mb-2' : 'top-full mt-2'
    ]"
  >
    <!-- Abas: só onde a figurinha pode ser enviada (no campo de mensagem) -->
    <div v-if="comFigurinhas" class="flex gap-1 border-b border-surface-200 px-2 pt-2">
      <button
        v-for="opcao in abas"
        :key="opcao.id"
        type="button"
        class="rounded-t-lg px-3 py-1.5 text-xs font-medium"
        :class="aba === opcao.id ? 'border-b-2 border-primary-600 text-primary-600' : 'text-surface-500 hover:text-surface-700'"
        @click="aba = opcao.id"
      >{{ opcao.nome }}</button>
    </div>

    <div v-if="aba === 'figurinhas'" class="max-h-[280px] overflow-y-auto p-2">
      <template v-for="pacote in PACOTES_FIGURINHAS" :key="pacote.id">
        <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">{{ pacote.nome }}</p>
        <div class="mb-2 grid grid-cols-4 gap-1">
          <button
            v-for="figurinha in pacote.figurinhas"
            :key="figurinha.id"
            type="button"
            class="flex items-center justify-center rounded-lg p-1 hover:bg-surface-100"
            :title="figurinha.nome"
            @click="emit('figurinha', figurinha.id)"
          >
            <FigurinhaLottie :id="figurinha.id" :tamanho="64" />
          </button>
        </div>
      </template>
    </div>

    <div v-else class="max-h-[280px] overflow-y-auto p-2">
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Populares</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisPopulares" :key="'pop-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" :title="emojiNome(emoji)" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Rostos</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisRostos" :key="'ros-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" :title="emojiNome(emoji)" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Gestos</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisGestos" :key="'ges-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" :title="emojiNome(emoji)" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Objetos</p>
      <div class="grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisObjetos" :key="'obj-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" :title="emojiNome(emoji)" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { emojiNome } from '../utils/emojiNomes'
import { PACOTES_FIGURINHAS } from '../utils/figurinhas'
import FigurinhaLottie from './FigurinhaLottie.vue'

withDefaults(defineProps<{
  alinhamento?: 'left' | 'right'
  direcao?: 'baixo' | 'cima'
  estatico?: boolean
  // Mostra a aba de figurinhas, que são enviadas na hora
  comFigurinhas?: boolean
}>(), {
  alinhamento: 'left',
  direcao: 'baixo',
  estatico: false,
  comFigurinhas: false
})

const emit = defineEmits<{
  selecionar: [emoji: string]
  figurinha: [id: string]
  close: []
}>()

// Abre sempre nos emojis, como no WhatsApp
const abas = [{ id: 'emojis', nome: 'Emojis' }, { id: 'figurinhas', nome: 'Figurinhas' }] as const
const aba = ref<(typeof abas)[number]['id']>('emojis')

const popupRef = ref<HTMLElement>()

const emojisPopulares = ['😂', '❤️', '😍', '🤣', '😊', '🙏', '😭', '😘', '👍', '😅', '🔥', '🥰', '😎', '💕', '🎉', '✨']
const emojisRostos = ['😀', '😃', '😄', '😁', '😆', '🥹', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫠', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '😱', '😨', '😰', '😢']
const emojisGestos = ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '💪', '🫂']
const emojisObjetos = ['💯', '💢', '💬', '👁️‍🗨️', '🗨️', '💭', '💤', '🎵', '🎶', '❤️‍🔥', '💔', '💖', '💗', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '⭐', '🌟', '💫', '🎈', '🎊', '🎁', '🏆', '⚽', '🎮', '📱', '💻', '📷', '🎬', '🎤', '🎧']

function onClickOutside(e: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>
