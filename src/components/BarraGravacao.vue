<template>
  <div class="flex min-w-0 flex-1 items-center rounded-full border bg-surface-100 px-2 pb-[1.5px] pt-[2px]"
      :class="pausado ? 'border-surface-300' : 'border-danger-300'">
    <!-- Discard button -->
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-danger-100 dark:hover:bg-danger-900 hover:text-danger-600 dark:hover:text-danger-400"
      title="Descartar"
      @click="emit('descartar')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    </button>

    <!-- Play preview button (only when paused) -->
    <button
      v-if="pausado"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-700"
      :title="reproduzindoPreview ? 'Parar preview' : 'Ouvir gravação'"
      @click="emit('toggle-preview')"
    >
      <!-- Stop icon when playing -->
      <svg v-if="reproduzindoPreview" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
      </svg>
      <!-- Play icon -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Recording indicator + timer -->
    <div class="flex items-center gap-2 px-2">
      <span class="h-2.5 w-2.5 rounded-full" :class="pausado ? 'bg-surface-400' : 'animate-pulse bg-danger-500'"></span>
      <span class="min-w-[36px] text-sm font-medium tabular-nums text-surface-700">{{ tempoFormatado }}</span>
    </div>

    <!-- Waveform (recording) / Progress bar (paused) -->
    <div class="flex flex-1 items-center px-4">
      <!-- Progress bar when paused -->
      <div
        v-if="pausado"
        class="relative h-5 w-full cursor-pointer flex items-center"
        @click="onSeek"
      >
        <div class="relative h-1 w-full rounded-full bg-surface-300">
          <div
            class="absolute left-0 top-0 h-full rounded-full bg-primary-500"
            :style="{ width: previewProgresso + '%' }"
          ></div>
          <div
            class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 shadow"
            :style="{ left: previewProgresso + '%' }"
          ></div>
        </div>
      </div>
      <!-- Waveform when recording -->
      <div v-else class="flex w-full items-center justify-center gap-[3px]">
        <span
          v-for="i in 20" :key="i"
          class="waveform-bar inline-block w-[3px] rounded-full bg-surface-400"
          :style="{ animationDelay: `${i * 0.08}s` }"
        ></span>
      </div>
    </div>

    <!-- Pause / Resume button -->
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition"
      :class="pausado
        ? 'text-danger-500 hover:bg-danger-50'
        : 'text-surface-500 hover:bg-surface-200 hover:text-surface-700'"
      :title="pausado ? 'Continuar gravação' : 'Pausar gravação'"
      @click="pausado ? emit('retomar') : emit('pausar')"
    >
      <!-- Mic icon (resume) when paused -->
      <svg v-if="pausado" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
      <!-- Pause icon when recording -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
        <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Send recording button -->
    <button
      class="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700"
      title="Enviar áudio"
      @click="emit('enviar')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  pausado: boolean
  tempoFormatado: string
  reproduzindoPreview: boolean
  previewProgresso: number
}>()

const emit = defineEmits<{
  descartar: []
  pausar: []
  retomar: []
  'toggle-preview': []
  seek: [pct: number]
  enviar: []
}>()

function onSeek(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  emit('seek', pct)
}
</script>

<style scoped>
.waveform-bar {
  height: 4px;
  animation: waveform 0.8s ease-in-out infinite alternate;
}

@keyframes waveform {
  0% { height: 4px; }
  100% { height: 20px; }
}
</style>
