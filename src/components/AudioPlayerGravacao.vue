<template>
  <div class="w-56 max-w-full md:w-72">
    <!-- Empty spacer to match AudioPlayerArquivo height -->
    <div class="h-[11px] pl-10 text-[11px]">&nbsp;</div>

    <div class="flex items-center gap-2">
      <!-- Play/Pause button -->
      <button
        class="-my-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
        :class="[
          isOwn ? 'text-primary-100/90 hover:bg-primary-100/20 hover:text-primary-100' : 'text-surface-600 hover:bg-surface-200 hover:text-surface-800',
          naoReproduzida ? 'text-success-500' : ''
        ]"
        :disabled="carregando"
        @click="alternarReproducao"
      >
        <svg v-if="carregando" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 animate-spin">
          <path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2Z" />
        </svg>
        <svg v-else-if="tocando" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Progress bar -->
      <div
        ref="barraRef"
        class="relative h-1.5 min-w-0 flex-1 cursor-pointer rounded-full"
        :class="isOwn ? 'bg-primary-100/30' : 'bg-surface-200'"
        @pointerdown="iniciarSeek"
      >
        <div
          class="absolute inset-y-0 left-0 rounded-full"
          :class="isOwn ? 'bg-primary-100' : 'bg-primary-500'"
          :style="{ width: progresso + '%' }"
        />
      </div>
    </div>

    <!-- Duration + status (same line) -->
    <div class="flex items-center justify-between pl-7">
      <span class="text-[10px] tabular-nums" :class="isOwn ? 'text-primary-200/70' : 'text-surface-500'">
        {{ tocando || tempoAtual > 0 ? formatarDuracao(tempoAtual) : formatarDuracao(duracaoTotal) }}
      </span>
      <slot name="status" />
    </div>

    <audio
      ref="audioRef"
      preload="none"
      @loadedmetadata="onMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @play="onPlay"
      @pause="onPause"
    />
  </div>
</template>

<script setup lang="ts">
import { useAudioPlayer, formatarDuracao } from '../composables/useAudioPlayer'

const props = defineProps<{
  src?: string
  identificador?: string
  conversaId?: number
  mensagemId?: number
  reproduzida?: boolean
  isOwn?: boolean
}>()

const {
  audioRef,
  barraRef,
  tocando,
  carregando,
  duracaoTotal,
  tempoAtual,
  progresso,
  naoReproduzida,
  alternarReproducao,
  iniciarSeek,
  onMetadata,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause
} = useAudioPlayer(props)
</script>
