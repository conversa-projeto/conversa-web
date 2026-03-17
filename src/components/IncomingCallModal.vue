<template>
  <div
    v-if="call.recebendoChamada && call.chamada"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-2xl">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900 text-success-600">
          <svg v-if="call.tipoChamada === 2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
        </div>

        <h3 class="text-lg font-semibold text-surface-800">Chamada recebida</h3>
        <p class="mt-1 text-sm text-surface-500">
          {{ call.chamadaRemetente?.usuario_nome || 'Algu\u00E9m' }} est&aacute; ligando...
        </p>
        <p class="mt-1 text-xs text-surface-400">
          {{ call.tipoChamada === 2 ? 'V\u00EDdeo + \u00C1udio' : 'Somente \u00C1udio' }}
        </p>
      </div>

      <div class="mt-6 flex justify-center gap-4">
        <CallControlButton
          variant="danger"
          size="lg"
          icon="leave"
          title="Recusar"
          @click="emit('reject')"
        />
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white shadow hover:bg-success-600"
          title="Atender"
          @click="emit('accept')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-7 w-7"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallStore } from '../stores/call'
import CallControlButton from './CallControlButton.vue'

const emit = defineEmits<{
  'accept': []
  'reject': []
}>()

const call = useCallStore()
</script>
