<template>
  <!-- No body: dentro da lista de mensagens (.chat-pattern isola o
       empilhamento) a janela ficaria por trás da caixa de mensagem -->
  <Teleport to="body">
    <div
      v-if="dialogo"
      class="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 px-4 py-6"
      @click.self="emit('responder', false)"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        :aria-label="dialogo.titulo"
        class="w-full max-w-sm rounded-2xl bg-surface-base p-5 shadow-2xl"
      >
        <h2 class="text-lg font-semibold text-surface-900">{{ dialogo.titulo }}</h2>
        <p class="mt-2 whitespace-pre-line text-sm text-surface-600">{{ dialogo.mensagem }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button
            v-if="!dialogo.somenteAviso"
            ref="botaoCancelar"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100"
            @click="emit('responder', false)"
          >{{ dialogo.textoCancelar || 'Cancelar' }}</button>
          <button
            ref="botaoConfirmar"
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition"
            :class="dialogo.perigo ? 'bg-danger-600 hover:bg-danger-700' : 'bg-primary-600 hover:bg-primary-700'"
            @click="emit('responder', true)"
          >{{ dialogo.textoConfirmar || 'OK' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { OpcoesDialogo } from '../composables/useDialogo'

const props = defineProps<{
  dialogo: (OpcoesDialogo & { somenteAviso: boolean }) | null
}>()

const emit = defineEmits<{
  responder: [confirmado: boolean]
}>()

const botaoCancelar = ref<HTMLButtonElement | null>(null)
const botaoConfirmar = ref<HTMLButtonElement | null>(null)

// Esc cancela. Enter aciona o botão com foco (comportamento do próprio botão).
function aoTeclar(evento: KeyboardEvent) {
  if (props.dialogo && evento.key === 'Escape') {
    evento.preventDefault()
    emit('responder', false)
  }
}

// Ao abrir, o foco vai para o botão principal; em ação destrutiva, para
// Cancelar, para um Enter sem pensar não excluir
watch(() => props.dialogo, async (dialogo) => {
  if (dialogo) {
    window.addEventListener('keydown', aoTeclar)
    await nextTick()
    ;((dialogo.perigo && botaoCancelar.value) || botaoConfirmar.value)?.focus()
  } else {
    window.removeEventListener('keydown', aoTeclar)
  }
}, { immediate: true })

onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>
