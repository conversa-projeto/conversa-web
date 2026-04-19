<template>
  <div
    v-if="aberta"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-surface-950/50 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface-base p-5 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-surface-900">Agendar mensagem</h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-700"
          title="Fechar"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-surface-600">Data</label>
          <DateInput v-model="data" placeholder="Selecionar data" />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-surface-600">Hora</label>
          <input
            v-model="hora"
            type="time"
            step="60"
            class="w-full rounded-lg border border-surface-300 bg-surface-100 px-2 py-1.5 text-sm text-surface-700 outline-none focus:border-primary-500"
          />
        </div>

        <p v-if="erro" class="text-xs text-danger-600">{{ erro }}</p>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100"
          @click="emit('close')"
        >Cancelar</button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!!erro || !data || !hora"
          @click="confirmar"
        >Agendar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DateInput from './DateInput.vue'

const props = defineProps<{ aberta: boolean }>()

const emit = defineEmits<{
  close: []
  confirmar: [isoLocal: string]
}>()

const data = ref('')
const hora = ref('')

watch(() => props.aberta, (aberto) => {
  if (aberto) {
    // Default: amanha as 08:00
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(8, 0, 0, 0)
    data.value = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`
    hora.value = '08:00'
  }
})

const dataHoraLocal = computed<Date | null>(() => {
  if (!data.value || !hora.value) return null
  const [ano, mes, dia] = data.value.split('-').map(Number)
  const [hh, mm] = hora.value.split(':').map(Number)
  if ([ano, mes, dia, hh, mm].some(v => !Number.isFinite(v))) return null
  return new Date(ano, mes - 1, dia, hh, mm, 0, 0)
})

const erro = computed(() => {
  if (!data.value || !hora.value) return ''
  const d = dataHoraLocal.value
  if (!d || Number.isNaN(d.getTime())) return 'Data/hora inválida'
  const agora = new Date()
  const minFuturo = new Date(agora.getTime() + 5 * 60 * 1000)
  if (d < minFuturo) return 'O envio deve ser no mínimo 5 minutos no futuro'
  const maxFuturo = new Date(agora)
  maxFuturo.setFullYear(maxFuturo.getFullYear() + 1)
  if (d > maxFuturo) return 'O envio não pode ser mais de 1 ano no futuro'
  return ''
})

function confirmar() {
  if (erro.value) return
  const d = dataHoraLocal.value
  if (!d) return
  emit('confirmar', d.toISOString())
}
</script>
