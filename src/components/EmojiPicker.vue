<template>
  <div ref="popupRef" class="absolute bottom-full left-0 z-20 mb-2 w-[320px] rounded-xl border border-surface-200 bg-surface-base shadow-lg">
    <div class="max-h-[280px] overflow-y-auto p-2">
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Populares</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisPopulares" :key="'pop-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Rostos</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisRostos" :key="'ros-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Gestos</p>
      <div class="mb-2 grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisGestos" :key="'ges-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
      <p class="mb-1 px-1 text-[11px] font-medium text-surface-400">Objetos</p>
      <div class="grid grid-cols-8 gap-0.5">
        <button v-for="emoji in emojisObjetos" :key="'obj-'+emoji" class="rounded p-1 text-xl hover:bg-surface-100" @click="emit('selecionar', emoji)">{{ emoji }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  selecionar: [emoji: string]
  close: []
}>()

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
