<template>
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
    <div class="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-base shadow-2xl">
      <div class="flex items-center justify-between border-b border-surface-200 px-5 py-4">
        <h2 class="text-base font-semibold text-surface-900">Mensagens agendadas</h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-700"
          title="Fechar"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <ul class="min-h-0 flex-1 divide-y divide-surface-200 overflow-y-auto">
        <li v-for="mensagem in chat.agendadasAtivas" :key="mensagem.id" class="flex items-start gap-3 px-5 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mt-0.5 h-4 w-4 shrink-0 text-primary-600"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-primary-600">{{ formatarPrazo(new Date(mensagem.visivel_em!)) }}</p>
            <p class="mt-0.5 break-words text-sm text-surface-800 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">{{ resumoMensagem(mensagem) }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-danger-600 transition hover:bg-danger-500/10 disabled:opacity-50 dark:text-danger-400"
            :disabled="cancelando === mensagem.id"
            @click="cancelar(mensagem.id)"
          >{{ cancelando === mensagem.id ? 'Cancelando...' : 'Cancelar' }}</button>
        </li>
      </ul>

      <p v-if="erro" class="mx-5 mb-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
    </div>
    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { resumoMensagem } from '../utils/formatters'
import { formatarPrazo } from '../utils/prazoEnquete'
import { useDialogo } from '../composables/useDialogo'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

// Agendadas da conversa aberta, que não aparecem no chat até a hora delas
const emit = defineEmits<{ close: [] }>()

const chat = useChatStore()
const cancelando = ref<number | null>(null)
const erro = ref('')
const dialogo = useDialogo()

// A última saiu (enviada na hora ou cancelada): nada mais a mostrar
watch(() => chat.agendadasAtivas.length, (quantidade) => { if (!quantidade) emit('close') })

// Cancelar apaga a agendada de vez: ninguém a viu ainda
async function cancelar(mensagemId: number) {
  const confirmado = await dialogo.confirmar({ titulo: 'Cancelar mensagem agendada', mensagem: 'Ela não será enviada.', textoConfirmar: 'Cancelar envio', textoCancelar: 'Voltar', perigo: true })
  if (!confirmado) return
  cancelando.value = mensagemId
  erro.value = ''
  try {
    await chat.excluirMensagem(mensagemId)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível cancelar'
  } finally {
    cancelando.value = null
  }
}
</script>
