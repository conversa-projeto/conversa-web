<template>
  <div
    v-if="call.videoAtivadoPor"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-2xl">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
        </div>

        <h3 class="text-lg font-semibold text-surface-800">V&iacute;deo ativado</h3>
        <p class="mt-1 text-sm text-surface-500">
          {{ call.videoAtivadoPor.usuarioNome }} ativou o v&iacute;deo
        </p>
        <p class="mt-1 text-xs text-surface-400">
          Deseja transmitir seu v&iacute;deo tamb&eacute;m?
        </p>
      </div>

      <div class="mt-6 flex justify-center gap-3">
        <button
          class="rounded-full bg-surface-200 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-300"
          @click="call.responderUpgradeVideo(false)"
        >
          Apenas assistir
        </button>
        <button
          class="rounded-full bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          @click="call.responderUpgradeVideo(true)"
        >
          Transmitir tamb&eacute;m
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallStore } from '../stores/call'

const call = useCallStore()
</script>
