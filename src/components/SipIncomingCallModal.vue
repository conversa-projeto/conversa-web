<template>
  <div
    v-if="sip.chamadaRecebida"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-2xl">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900 text-success-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </div>

        <h3 class="text-lg font-semibold text-surface-800">Chamada recebida</h3>
        <p class="mt-1 text-base font-medium text-surface-700">{{ nomeExibido }}</p>
        <p class="mt-0.5 text-sm text-surface-500">{{ numeroExibido }}</p>
      </div>

      <div class="mt-6 flex justify-center gap-8">
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500 text-white shadow hover:bg-danger-600"
          title="Recusar"
          @click="sip.recusarChamada()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-7 w-7 rotate-[135deg]">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </button>
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white shadow hover:bg-success-600"
          title="Atender"
          @click="sip.aceitarChamada()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-7 w-7">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSipStore } from '../stores/sip'

const sip = useSipStore()

const nomeExibido = computed(() => {
  const identity = sip.chamadaRecebida?.remoteIdentity
  return identity?.displayName || identity?.uri?.user || 'Desconhecido'
})

const numeroExibido = computed(() => {
  const identity = sip.chamadaRecebida?.remoteIdentity
  if (identity?.displayName && identity?.uri?.user) {
    return identity.uri.user
  }
  return ''
})
</script>
