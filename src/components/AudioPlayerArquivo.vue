<template>
  <div class="w-56 max-w-full pt-1.5 md:w-72" data-media-player>
    <!-- Name (only for audio files with a name) -->
    <div v-if="nome" class="truncate pl-10 pr-3 text-[11px]" :class="isOwn ? 'text-enviada-suave/70' : 'text-surface-500'" :title="nome">
      {{ nome }}
    </div>

    <div class="flex items-center gap-2 pr-3">
      <!-- Play/Pause button -->
      <button
        class="-my-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
        :class="[
          isOwn ? 'text-enviada-suave/90 hover:bg-enviada-suave/20 hover:text-enviada-suave' : 'text-surface-600 hover:bg-surface-200 hover:text-surface-800',
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

      <!-- Progress bar (a onda, quando o áudio tem a intensidade gravada) -->
      <div
        ref="barraRef"
        class="relative min-w-0 flex-1 cursor-pointer"
        :class="intensidade?.length ? 'h-7' : ['h-1.5 rounded-full border', isOwn ? 'border-enviada-suave/40 bg-enviada-suave/25' : 'border-surface-300 bg-surface-200']"
        @pointerdown="iniciarSeek"
      >
        <OndaAudio v-if="intensidade?.length" :intensidade="intensidade" :progresso="progresso" :is-own="isOwn" />
        <div
          v-else
          class="absolute inset-y-0 left-0 rounded-full"
          :class="isOwn ? 'bg-enviada-destaque' : 'bg-primary-500'"
          :style="{ width: progresso + '%' }"
        />
      </div>

      <!-- Velocidade -->
      <button
        type="button"
        class="-my-1 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums transition"
        :class="isOwn ? 'bg-enviada-suave/20 text-enviada-suave hover:bg-enviada-suave/30' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'"
        title="Velocidade"
        @click="trocarVelocidade"
      >
        {{ rotuloVelocidade(velocidade) }}
      </button>
    </div>

    <!-- Duration + status (same line) -->
    <div class="flex items-center justify-between pl-7">
      <span class="text-[10px] tabular-nums" :class="isOwn ? 'text-enviada-suave/70' : 'text-surface-500'">
        {{ tocando || tempoAtual > 0 ? formatarDuracao(tempoAtual) + (duracaoTotal ? ` / ${formatarDuracao(duracaoTotal)}` : '') : formatarDuracao(duracaoTotal) }}
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
import { useAudioPlayer, formatarDuracao, rotuloVelocidade } from '../composables/useAudioPlayer'
import OndaAudio from './OndaAudio.vue'

const props = defineProps<{
  src?: string
  identificador?: string
  conversaId?: number
  mensagemId?: number
  reproduzida?: boolean
  // Gravados no envio: a duração aparece e a onda é desenhada sem baixar o áudio
  duracao?: number | null
  intensidade?: number[] | null
  nome: string
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
  velocidade,
  alternarReproducao,
  trocarVelocidade,
  iniciarSeek,
  onMetadata,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause
} = useAudioPlayer(props)
</script>
